export const classSchema = {
  validateClass: (data: Record<string, any>) => {
    const errors: Record<string, string> = {};
    if (!data.name) errors.name = "Class name is required";
    if (!data.grade) errors.grade = "Grade level is required";
    if (!data.section) errors.section = "Section is required";

    return {
      success: Object.keys(errors).length === 0,
      errors,
    };
  },
};
export default classSchema;
