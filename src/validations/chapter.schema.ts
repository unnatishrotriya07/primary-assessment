export const chapterSchema = {
  validateChapter: (data: Record<string, any>) => {
    const errors: Record<string, string> = {};
    if (!data.title) errors.title = "Chapter title is required";
    if (!data.number) errors.number = "Chapter number is required";
    if (!data.subjectId) errors.subjectId = "Linked subject reference is required";

    return {
      success: Object.keys(errors).length === 0,
      errors,
    };
  },
};
export default chapterSchema;
