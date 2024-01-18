const express = require("express");
const cors = require("cors");
const { connect } = require("mongoose");

var usersRouter = require("./routes/userRoutes");
var postRouter = require("./routes/postsRouter");

require("dotenv").config();
const upload = require("express-fileupload");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const app = express();

app.use(express.json({ extended: true }));
app.use(express.urlencoded({ extended: true }));
app.use(cors({ credentials: true }));
app.use(upload());
app.use("/uploads", express.static(__dirname + "/uploads"));

app.use("/api/users", usersRouter);
app.use("/api/posts", postRouter);

app.use(notFound);
app.use(errorHandler);

connect(process.env.MONGO)
  .then(
    app.listen(4000, () =>
      console.log(`server started on port ${process.env.PORT}`)
    )
  )
  .catch((err) => console.log("server error", err));
// app.listen(4000, () => console.log("connected to port 4000"));
