package com.university.lms.gradebook.service;

import com.university.lms.gradebook.domain.GradeHistory;
import com.university.lms.gradebook.repository.GradeHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class GradeHistoryService {

    private final GradeHistoryRepository historyRepository;

    public List<GradeHistory> getHistoryForEntry(UUID entryId) {
        return historyRepository.findByGradebookEntry_Id(entryId);
    }

    public void recordChange(com.university.lms.gradebook.domain.GradebookEntry entry,
                             BigDecimal oldScore,
                             BigDecimal newScore,
                             UUID changedBy,
                             String reason) {
        if ((oldScore == null && newScore == null) || (oldScore != null && oldScore.compareTo(newScore) == 0)) {
            return;
        }

        GradeHistory history = GradeHistory.builder()
                .gradebookEntry(entry)
                .oldScore(oldScore)
                .newScore(newScore)
                .changedBy(changedBy)
                .changeReason(reason)
                .build();

        historyRepository.save(history);
    }
}

