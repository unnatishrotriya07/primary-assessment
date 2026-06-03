export const assessmentSchema = {
  validateAssessment: (data: Record<string, any>) => {
    const errors: Record<string, string> = {};
    if (!data.title) errors.title = "Assessment title is required";
    if (!data.subjectId) errors.subjectId = "Subject reference is required";
    if (!data.classId) errors.classId = "Target class group is required";
    if (!data.questionsCount || data.questionsCount <= 0) {
      errors.questionsCount = "A positive number of questions is required";
    }

    return {
      success: Object.keys(errors).length === 0,
      errors,
    };
  },
};
export default assessmentSchema;
