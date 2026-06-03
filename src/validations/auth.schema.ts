export const authSchema = {
  validateLogin: (data: Record<string, any>) => {
    const errors: Record<string, string> = {};
    if (!data.email) {
      errors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(data.email)) {
      errors.email = "Invalid email address";
    }
    
    if (!data.password) {
      errors.password = "Password is required";
    } else if (data.password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }

    return {
      success: Object.keys(errors).length === 0,
      errors,
    };
  },
};
export default authSchema;
