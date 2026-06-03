export const questionSchema = {
  validateQuestion: (data: Record<string, any>) => {
    const errors: Record<string, string> = {};
    if (!data.text) errors.text = "Question text prompt is required";
    if (!data.subjectId) errors.subjectId = "Subject reference is required";
    if (!data.options || !Array.isArray(data.options) || data.options.length < 2) {
      errors.options = "At least 2 answer options are required";
    }

    return {
      success: Object.keys(errors).length === 0,
      errors,
    };
  },
};
export default questionSchema;
