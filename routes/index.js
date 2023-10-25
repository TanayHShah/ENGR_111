const mainRoutes = require("./main");

const constructorMethod = (app) => {
  app.use("/", mainRoutes);

  app.use("*", (req, res) => {
    return res.status(404).render("error/error", {
      title: "Error",
      error: "PAGE NOT FOUND",
      status: 404,
      layout: "error",
    });
  });
};

module.exports = constructorMethod;