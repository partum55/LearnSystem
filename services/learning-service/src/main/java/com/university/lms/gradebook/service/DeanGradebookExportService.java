package com.university.lms.gradebook.service;

import com.university.lms.common.exception.ResourceNotFoundException;
import com.university.lms.common.exception.ValidationException;
import com.university.lms.course.adminops.service.AdminAuditTrailService;
import com.university.lms.course.assessment.domain.Assignment;
import com.university.lms.course.assessment.repository.AssignmentRepository;
import com.university.lms.course.domain.Course;
import com.university.lms.course.repository.CourseRepository;
import com.university.lms.gradebook.domain.GradebookEntry;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import com.university.lms.course.repository.CourseMemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.DataFormat;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.VerticalAlignment;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Creates formatted dean-office XLSX gradebook statements. */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class DeanGradebookExportService {

  private final CourseRepository courseRepository;
  private final AssignmentRepository assignmentRepository;
  private final GradebookEntryService gradebookEntryService;
  private final JdbcTemplate jdbcTemplate;
  private final AdminAuditTrailService adminAuditTrailService;
  private final CourseMemberRepository courseMemberRepository;

  public DeanGradebookFile export(UUID courseId, String semester, String groupCode, UUID actorId, String actorRole) {
    Course course =
        courseRepository
            .findById(courseId)
            .orElseThrow(() -> new ResourceNotFoundException("Course", "id", courseId));

    if (!"SUPERADMIN".equals(actorRole)
        && !courseMemberRepository.canUserManageCourse(courseId, actorId)) {
      throw new org.springframework.security.access.AccessDeniedException(
          "Not authorized to export this course gradebook");
    }

    List<Assignment> assignments = assignmentRepository.findByCourseIdOrderByDueDateAsc(courseId);
    if (assignments.isEmpty()) {
      throw new ValidationException("Course has no assignments to export");
    }

    List<GradebookEntry> entries = gradebookEntryService.getEntriesForCourse(courseId, actorId);
    Set<UUID> studentIds =
        entries.stream().map(GradebookEntry::getStudentId).filter(Objects::nonNull).collect(LinkedHashSet::new, Set::add, Set::addAll);

    List<StudentRow> students = fetchStudents(studentIds);
    String normalizedGroup = normalizeNullable(groupCode);
    if (normalizedGroup != null) {
      students =
          students.stream()
              .filter(student -> normalizedGroup.equalsIgnoreCase(normalizeNullable(student.groupCode())))
              .toList();
    }

    Map<UUID, Map<UUID, GradebookEntry>> gradeMatrix = buildGradeMatrix(entries);
    String semesterValue =
        normalizeNullable(semester) != null ? semester.trim() : normalizeNullable(course.getAcademicYear());
    String groupValue = normalizedGroup == null ? "ALL" : normalizedGroup;

    byte[] content = buildWorkbook(course, assignments, students, gradeMatrix, semesterValue, groupValue);
    String filename = buildFilename(course.getCode(), semesterValue);

    Map<String, Object> details = new LinkedHashMap<>();
    details.put("courseId", courseId.toString());
    details.put("courseCode", course.getCode());
    details.put("semester", semesterValue);
    details.put("group", groupValue);
    details.put("studentCount", students.size());
    details.put("assignmentCount", assignments.size());
    details.put("generatedAt", LocalDateTime.now().toString());
    adminAuditTrailService.log(actorId, "GRADEBOOK_EXPORTED_DEAN", "COURSE", course.getCode(), details);

    return new DeanGradebookFile(filename, content);
  }

  private byte[] buildWorkbook(
      Course course,
      List<Assignment> assignments,
      List<StudentRow> students,
      Map<UUID, Map<UUID, GradebookEntry>> gradeMatrix,
      String semesterValue,
      String groupValue) {
    try (XSSFWorkbook workbook = new XSSFWorkbook();
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
      XSSFSheet sheet = workbook.createSheet("Dean Gradebook");

      CellStyle metaLabelStyle = createMetaLabelStyle(workbook);
      CellStyle metaValueStyle = createMetaValueStyle(workbook);
      CellStyle headerStyle = createHeaderStyle(workbook);
      CellStyle textCellStyle = createTextCellStyle(workbook);
      CellStyle numberCellStyle = createNumberCellStyle(workbook);

      int rowIndex = 0;
      Row titleRow = sheet.createRow(rowIndex++);
      titleRow.createCell(0).setCellValue("Dean Gradebook Statement");
      titleRow.getCell(0).setCellStyle(metaLabelStyle);

      rowIndex = writeMetaRow(sheet, rowIndex, "Course", (course.getCode() + " - " + resolveCourseTitle(course)), metaLabelStyle, metaValueStyle);
      rowIndex = writeMetaRow(sheet, rowIndex, "Semester", valueOrDash(semesterValue), metaLabelStyle, metaValueStyle);
      rowIndex = writeMetaRow(sheet, rowIndex, "Group", valueOrDash(groupValue), metaLabelStyle, metaValueStyle);

      rowIndex++;
      Row headerRow = sheet.createRow(rowIndex++);
      int columnIndex = 0;
      writeHeaderCell(headerRow, columnIndex++, "#", headerStyle);
      writeHeaderCell(headerRow, columnIndex++, "Student ID", headerStyle);
      writeHeaderCell(headerRow, columnIndex++, "Student Name", headerStyle);
      writeHeaderCell(headerRow, columnIndex++, "Email", headerStyle);
      writeHeaderCell(headerRow, columnIndex++, "Group", headerStyle);
      for (Assignment assignment : assignments) {
        writeHeaderCell(
            headerRow,
            columnIndex++,
            assignment.getTitle() + " (" + decimalToString(assignment.getMaxPoints()) + ")",
            headerStyle);
      }
      writeHeaderCell(headerRow, columnIndex++, "Total", headerStyle);
      writeHeaderCell(headerRow, columnIndex++, "Max", headerStyle);
      writeHeaderCell(headerRow, columnIndex++, "Average %", headerStyle);
      writeHeaderCell(headerRow, columnIndex, "Status", headerStyle);

      int ordinal = 1;
      BigDecimal totalMax = assignments.stream().map(Assignment::getMaxPoints).filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
      for (StudentRow student : students) {
        Row row = sheet.createRow(rowIndex++);
        int dataCol = 0;
        writeTextCell(row, dataCol++, String.valueOf(ordinal++), textCellStyle);
        writeTextCell(row, dataCol++, valueOrDash(student.studentId()), textCellStyle);
        writeTextCell(row, dataCol++, valueOrDash(student.name()), textCellStyle);
        writeTextCell(row, dataCol++, valueOrDash(student.email()), textCellStyle);
        writeTextCell(row, dataCol++, valueOrDash(student.groupCode()), textCellStyle);

        Map<UUID, GradebookEntry> studentGrades = gradeMatrix.getOrDefault(student.id(), Map.of());
        BigDecimal totalScore = BigDecimal.ZERO;
        BigDecimal gradedMax = BigDecimal.ZERO;
        int gradedItems = 0;

        for (Assignment assignment : assignments) {
          GradebookEntry entry = studentGrades.get(assignment.getId());
          BigDecimal score = entry == null ? null : entry.getFinalScore();
          if (score != null) {
            writeNumberCell(row, dataCol++, score, numberCellStyle);
            totalScore = totalScore.add(score);
            gradedItems++;
            if (assignment.getMaxPoints() != null) {
              gradedMax = gradedMax.add(assignment.getMaxPoints());
            }
          } else {
            writeTextCell(row, dataCol++, "", textCellStyle);
          }
        }

        writeNumberCell(row, dataCol++, totalScore, numberCellStyle);
        writeNumberCell(row, dataCol++, totalMax, numberCellStyle);

        BigDecimal averagePercent = null;
        if (gradedMax.compareTo(BigDecimal.ZERO) > 0) {
          averagePercent =
              totalScore
                  .multiply(BigDecimal.valueOf(100))
                  .divide(gradedMax, 2, RoundingMode.HALF_UP);
        }
        if (averagePercent != null) {
          writeNumberCell(row, dataCol++, averagePercent, numberCellStyle);
        } else {
          writeTextCell(row, dataCol++, "", textCellStyle);
        }
        writeTextCell(
            row,
            dataCol,
            gradedItems == assignments.size() ? "COMPLETE" : "IN_PROGRESS",
            textCellStyle);
      }

      configureColumns(sheet, assignments.size());
      sheet.createFreezePane(5, 6);
      workbook.write(outputStream);
      return outputStream.toByteArray();
    } catch (Exception exception) {
      log.error("Failed to build dean gradebook workbook for course {}", course.getId(), exception);
      throw new ValidationException("Failed to generate dean gradebook export");
    }
  }

  private void configureColumns(XSSFSheet sheet, int assignmentCount) {
    sheet.setColumnWidth(0, 2000);
    sheet.setColumnWidth(1, 4200);
    sheet.setColumnWidth(2, 9000);
    sheet.setColumnWidth(3, 9000);
    sheet.setColumnWidth(4, 3600);
    for (int i = 0; i < assignmentCount; i++) {
      sheet.setColumnWidth(5 + i, 4800);
    }
    int offset = 5 + assignmentCount;
    sheet.setColumnWidth(offset, 4200);
    sheet.setColumnWidth(offset + 1, 4200);
    sheet.setColumnWidth(offset + 2, 4200);
    sheet.setColumnWidth(offset + 3, 4200);
  }

  private int writeMetaRow(
      XSSFSheet sheet,
      int rowIndex,
      String key,
      String value,
      CellStyle labelStyle,
      CellStyle valueStyle) {
    Row row = sheet.createRow(rowIndex);
    row.createCell(0).setCellValue(key);
    row.getCell(0).setCellStyle(labelStyle);
    row.createCell(1).setCellValue(value);
    row.getCell(1).setCellStyle(valueStyle);
    return rowIndex + 1;
  }

  private void writeHeaderCell(Row row, int index, String value, CellStyle style) {
    row.createCell(index).setCellValue(value);
    row.getCell(index).setCellStyle(style);
  }

  private void writeTextCell(Row row, int index, String value, CellStyle style) {
    row.createCell(index).setCellValue(value == null ? "" : value);
    row.getCell(index).setCellStyle(style);
  }

  private void writeNumberCell(Row row, int index, BigDecimal value, CellStyle style) {
    if (value == null) {
      writeTextCell(row, index, "", style);
      return;
    }
    row.createCell(index).setCellValue(value.doubleValue());
    row.getCell(index).setCellStyle(style);
  }

  private CellStyle createMetaLabelStyle(XSSFWorkbook workbook) {
    CellStyle style = workbook.createCellStyle();
    Font boldFont = workbook.createFont();
    boldFont.setBold(true);
    style.setFont(boldFont);
    return style;
  }

  private CellStyle createMetaValueStyle(XSSFWorkbook workbook) {
    CellStyle style = workbook.createCellStyle();
    style.setAlignment(HorizontalAlignment.LEFT);
    return style;
  }

  private CellStyle createHeaderStyle(XSSFWorkbook workbook) {
    CellStyle style = workbook.createCellStyle();
    Font font = workbook.createFont();
    font.setBold(true);
    style.setFont(font);
    style.setAlignment(HorizontalAlignment.CENTER);
    style.setVerticalAlignment(VerticalAlignment.CENTER);
    style.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
    style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
    style.setWrapText(true);
    style.setBorderTop(BorderStyle.THIN);
    style.setBorderBottom(BorderStyle.THIN);
    style.setBorderLeft(BorderStyle.THIN);
    style.setBorderRight(BorderStyle.THIN);
    return style;
  }

  private CellStyle createTextCellStyle(XSSFWorkbook workbook) {
    CellStyle style = workbook.createCellStyle();
    style.setBorderTop(BorderStyle.THIN);
    style.setBorderBottom(BorderStyle.THIN);
    style.setBorderLeft(BorderStyle.THIN);
    style.setBorderRight(BorderStyle.THIN);
    return style;
  }

  private CellStyle createNumberCellStyle(XSSFWorkbook workbook) {
    CellStyle style = createTextCellStyle(workbook);
    DataFormat dataFormat = workbook.createDataFormat();
    style.setDataFormat(dataFormat.getFormat("0.00"));
    style.setAlignment(HorizontalAlignment.RIGHT);
    return style;
  }

  private Map<UUID, Map<UUID, GradebookEntry>> buildGradeMatrix(List<GradebookEntry> entries) {
    Map<UUID, Map<UUID, GradebookEntry>> matrix = new HashMap<>();
    for (GradebookEntry entry : entries) {
      if (entry.getStudentId() == null || entry.getAssignmentId() == null) {
        continue;
      }
      matrix.computeIfAbsent(entry.getStudentId(), ignored -> new HashMap<>()).put(entry.getAssignmentId(), entry);
    }
    return matrix;
  }

  private List<StudentRow> fetchStudents(Collection<UUID> studentIds) {
    if (studentIds.isEmpty()) {
      return List.of();
    }
    List<UUID> ids = new ArrayList<>(studentIds);
    String placeholders = ids.stream().map(ignored -> "?").reduce((a, b) -> a + "," + b).orElse("?");
    String sql =
        "SELECT id, student_id, "
            + "COALESCE(display_name, CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, '')), email) AS full_name, "
            + "email, "
            + "COALESCE(preferences->>'groupCode', preferences->>'group_code', '') AS group_code "
            + "FROM users WHERE id IN ("
            + placeholders
            + ")";

    List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql, ids.toArray());
    return rows.stream()
        .map(this::toStudentRow)
        .filter(Objects::nonNull)
        .sorted(
            Comparator.comparing(StudentRow::name, Comparator.nullsLast(String::compareToIgnoreCase))
                .thenComparing(StudentRow::email, Comparator.nullsLast(String::compareToIgnoreCase)))
        .toList();
  }

  private StudentRow toStudentRow(Map<String, Object> row) {
    UUID id = asUuid(row.get("id"));
    if (id == null) {
      return null;
    }
    return new StudentRow(
        id,
        normalizeNullable(asString(row.get("student_id"))),
        normalizeNullable(asString(row.get("full_name"))),
        normalizeNullable(asString(row.get("email"))),
        normalizeNullable(asString(row.get("group_code"))));
  }

  private UUID asUuid(Object value) {
    if (value == null) {
      return null;
    }
    if (value instanceof UUID uuid) {
      return uuid;
    }
    try {
      return UUID.fromString(String.valueOf(value));
    } catch (IllegalArgumentException exception) {
      return null;
    }
  }

  private String asString(Object value) {
    return value == null ? null : String.valueOf(value);
  }

  private String resolveCourseTitle(Course course) {
    String titleUk = normalizeNullable(course.getTitleUk());
    if (titleUk != null) {
      return titleUk;
    }
    String titleEn = normalizeNullable(course.getTitleEn());
    return titleEn == null ? "Untitled Course" : titleEn;
  }

  private String decimalToString(BigDecimal value) {
    if (value == null) {
      return "-";
    }
    return value.setScale(2, RoundingMode.HALF_UP).toPlainString();
  }

  private String valueOrDash(String value) {
    return value == null ? "-" : value;
  }

  private String buildFilename(String courseCode, String semesterValue) {
    String safeCode = sanitizeFileToken(courseCode == null ? "course" : courseCode);
    String safeSemester = sanitizeFileToken(semesterValue == null ? "semester" : semesterValue);
    return "dean-gradebook-" + safeCode + "-" + safeSemester + ".xlsx";
  }

  private String sanitizeFileToken(String value) {
    String normalized = value.trim().replaceAll("[^A-Za-z0-9_-]", "_");
    return normalized.isBlank() ? "value" : normalized.toLowerCase(Locale.ROOT);
  }

  private String normalizeNullable(String value) {
    if (value == null) {
      return null;
    }
    String trimmed = value.trim();
    return trimmed.isEmpty() ? null : trimmed;
  }

  public record DeanGradebookFile(String filename, byte[] content) {}

  private record StudentRow(UUID id, String studentId, String name, String email, String groupCode) {}
}
