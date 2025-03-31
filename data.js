const db = require("./app/models");

const roleInitial = async () => {
  try {
    const roleModel = db.role;

    const count = await roleModel.estimatedDocumentCount();

    if (count === 0) {
      const roles = db.ROLES;
      const rolePromises = roles.map((role) =>
        new roleModel({ name: role }).save()
      );
      await Promise.all(rolePromises);
    }
  } catch (error) { 
    console.error("Init data error", error);
    process.exit();
  }
};

module.exports = {
  roleInitial,
};
