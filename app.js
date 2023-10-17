// Requiring module
const express = require('express');

// Creating express object
const app = express();
const static = express.static(__dirname + "/public");
const exphbs = require('express-handlebars');
app.use("/public", static);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.engine(
  "handlebars",
  exphbs.engine({
    defaultLayout: "main",
  })
);
app.set("view engine", "handlebars");
app.get('/', (req, res) => {
res.render('main', {layout : 'index'});
});

// Port Number
const PORT = process.env.PORT ||5000;

// Server Setup
app.listen(PORT,console.log(
`Server started on port ${PORT}`));
