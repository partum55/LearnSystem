# Virtual Programming Lab (VPL) Feature

## Overview

The Virtual Programming Lab (VPL) is a feature that allows students to write, execute, and test code directly in the browser without needing to set up a local development environment.

## Features

### For Students
- **In-Browser Code Editor**: Write code using Monaco Editor (the same editor used in VS Code)
- **Multiple Language Support**: Python, JavaScript, Java, C, and C++
- **Code Execution**: Run code directly in the browser and see output
- **Test Cases**: Automated testing with predefined test cases
- **Real-time Feedback**: See execution results, errors, and test case results immediately
- **Auto-grading**: Get instant scores based on test case results

### For Instructors
- **Create VPL Assignments**: Select "Virtual Programming Lab" as the assignment type
- **Language Selection**: Choose the programming language for the assignment
- **Starter Code**: Provide initial code template for students
- **Solution Code**: Store the reference solution (instructor only)
- **Test Cases**: Define input/output test cases for auto-grading
- **Points Assignment**: Assign points to individual test cases

## How to Use

### Creating a VPL Assignment (Instructor)

1. Navigate to your course
2. Click "Create Assignment"
3. Select "Virtual Programming Lab" as the assignment type
4. Fill in the basic information:
   - Title
   - Description
   - Instructions
   - Due date
5. Configure VPL settings:
   - Select programming language (Python, JavaScript, Java, C, C++)
   - Add starter code (optional)
   - Add solution code (instructor only, optional)
6. Enable auto-grading and add test cases:
   - Input: What will be provided to the program
   - Expected Output: What the program should produce
   - Points: Points awarded for passing this test case
7. Save and publish the assignment

### Completing a VPL Assignment (Student)

1. Navigate to the assignment
2. Click "Open Virtual Lab"
3. Write your code in the editor
4. (Optional) Add input for your program
5. Click "Run Code" to execute
6. Review:
   - Standard output
   - Error messages (if any)
   - Test results (if auto-grading is enabled)
   - Your score

## Technical Details

### Backend

**New Files:**
- `VirtualLabService.java` - Handles code execution and test case evaluation
- `VirtualLabController.java` - REST API endpoint for code execution
- `CodeExecutionRequest.java` - DTO for execution requests
- `CodeExecutionResult.java` - DTO for execution results
- `TestCaseResult.java` - DTO for individual test case results

**API Endpoint:**
```
POST /api/assessments/virtual-lab/execute
{
  "assignmentId": "uuid",
  "code": "string",
  "language": "python|javascript|java|c|cpp",
  "input": "string (optional)"
}
```

**Response:**
```json
{
  "output": "string",
  "error": "string",
  "exitCode": 0,
  "executionTime": 123,
  "success": true,
  "testResults": [
    {
      "name": "Test Case 1",
      "input": "input data",
      "expectedOutput": "expected",
      "actualOutput": "actual",
      "passed": true,
      "points": 10.0
    }
  ]
}
```

### Frontend

**New Files:**
- `VirtualLab.tsx` - Main component for the virtual lab interface

**Updated Files:**
- `App.tsx` - Added routing for /virtual-lab/:assignmentId
- `AssignmentEditor.tsx` - Added VIRTUAL_LAB type and configuration UI
- `AssignmentDetail.tsx` - Added "Open Virtual Lab" button for VPL assignments
- `types/index.ts` - Added VIRTUAL_LAB to AssignmentType and starter_code field

**Translations:**
- English: "Virtual Programming Lab"
- Ukrainian: "Віртуальна лабораторія програмування"

## Security Considerations

1. **Timeout Protection**: Code execution is limited to 10 seconds
2. **Output Length Limit**: Output is capped at 10,000 characters
3. **Isolated Execution**: Code runs in temporary directories that are cleaned up
4. **No Network Access**: Executed code cannot access external network resources

## Supported Languages

| Language   | Command/Compiler |
|------------|------------------|
| Python     | python3          |
| JavaScript | node             |
| Java       | javac + java     |
| C          | gcc              |
| C++        | g++              |

## Future Enhancements

- Docker-based code execution for better isolation
- More language support (Ruby, Go, Rust, etc.)
- Code plagiarism detection
- Collaborative coding features
- Code review and annotation tools
- Performance metrics and optimization suggestions
