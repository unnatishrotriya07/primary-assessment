export const subjectSchema = {
  validateSubject: (data: Record<string, any>) => {
    const errors: Record<string, string> = {};
    if (!data.name) errors.name = "Subject name is required";
    if (!data.code) errors.code = "Subject code is required";

    return {
      success: Object.keys(errors).length === 0,
      errors,
    };
  },
};
export default subjectSchema;
