const bcrypt = require("bcryptjs");
const User = require("../model/userModel");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const { v4: uuid } = require("uuid");
const HttpError = require("../model/errorModel");
// const jwtSecret = "jwt-secretyuiop-wjcgeejke";

const registerUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    console.log(req.body);
    if (!name || !email || !password) {
      // return res.send("Fill in all fields");
      return next(new HttpError("Fill in all fields", 422));
    }
    const newEmail = email.toLowerCase();
    const emailExist = await User.findOne({ email: newEmail });
    if (emailExist) {
      // return res.send("Email already exists");
      return next(new HttpError("Email already exists", 422));
    }
    if (password.trim().length < 6) {
      // return res.send("Password must be at least 6");
      return next(
        new HttpError("Password should be at least 6 chraracters.", 422)
      );
    }

    const hashedPass = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      name,
      email: newEmail,
      password: hashedPass,
    });
    res.status(201).json(newUser);
  } catch (error) {
    // return res.send("User registration failed");
    return next(new HttpError("User registration failed", 422));
  }
};

const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const newEmail = email.toLowerCase();

    const validUser = await User.findOne({ email: newEmail });

    if (!validUser) {
      // return res
      //   .status(404)
      //   .json({ success: false, message: "User not found!" });
      return next(new HttpError("User not found!", 422));
    }

    const validPassword = bcrypt.compareSync(password, validUser.password);
    if (!validPassword) {
      // return res
      // .status(401)
      // .json({ success: false, message: "Wrong credentials!" });
      return next(new HttpError("Wrong credentials!", 401));
    }

    const data = {
      user: {
        id: validUser.id,
        name: validUser.name,
      },
    };
    const jwtSecret = process.env.JWT_SCERT;
    const authToken = jwt.sign(data, jwtSecret);
    res.status(200).json({ success: true, authToken, data });
  } catch (error) {
    console.log(error);
    // res.status(500).json({ success: false, message: "Internal Server Error" });
    return next(new HttpError("Internal Server Error", 500));
  }

  //   try {
  //     const { email, password } = req.body;
  //     console.log(req.body);
  //     if (!email || !password) {
  //       return res.send("Fill all Fields");
  //     }
  //     const newEmail = email.toLowerCase();

  //     const user = await User.findOne({ email: newEmail });
  //     if (!user) {
  //       return res.send("invalid credentials.");
  //     }
  //     const comparePass = await bcrypt.compare(password, user.password);
  //     if (!comparePass) {
  //       return res.send("invalid credentials.");
  //     }
  //     const { _id: id, name } = user;
  //     const token = jwt.sign({ id, name }, process.env.JWT_SECRET, {
  //       expiresIn: "1d",
  //     });

  //     res.send(200).json({ token, id, name });
  //   } catch (error) {
  //     return res.send(
  //       "Login failed. Please Check your credentials. ",
  //       error.message
  //     );
  //   }
};

const getUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select("-password");
    if (!user) {
      // return res.status(404).send("User not found.");
      return next(new HttpError("User not found.", 404));
    }
    res.status(200).json(user);
  } catch (error) {
    return res.send(error.message);
  }
};

const changeAvatar = async (req, res, next) => {
  try {
    // console.log(req.files.avatar);
    if (!req.files.avatar) {
      // return res.send("please choose an image");
      return next(new HttpError("please choose an image", 404));
    }

    // find user from Database
    const user = await User.findById(req.user.user.id);
    // console.log(req.user.user.id);
    // delete old avatar if it exists
    if (user.avatar) {
      fs.unlink(path.join(__dirname, "..", "uploads", user.avatar), (err) => {
        if (err) {
          return res.send(err);
        }
      });
    }

    const { avatar } = req.files;
    // console.log(avatar);
    // check file size
    if (avatar.size > 500000) {
      // return res.send("Profile picture too large. Should be less than 500kb.");
      return next(
        new HttpError(
          "Profile picture too large. Should be less than 500kb.",
          404
        )
      );
    }
    let fileName = avatar.name;
    let splitFlieName = fileName.split(".");
    let newFileName =
      splitFlieName[0] + uuid() + "." + splitFlieName[splitFlieName.length - 1];
    console.log(avatar);
    avatar.mv(
      path.join(__dirname, "..", "uploads", newFileName),
      async (err) => {
        if (err) {
          return res.send(err);
        }
        const updatedAvatar = await User.findByIdAndUpdate(
          req.user.user.id,
          { avatar: newFileName },
          { new: true }
        );
        console.log(updatedAvatar);
        if (!updatedAvatar) {
          // return res.send("Avatar couldn't be changed");
          return next(new HttpError("Avatar couldn't be changed", 404));
        }
        res.status(200).json(updatedAvatar);
      }
    );
    // console.log(req.files);
  } catch (error) {
    return res.send(error.message);
  }
};

const EditUser = async (req, res, next) => {
  try {
    const { name, email, currentPassword, newPassword, newConfirmPassword } =
      req.body;
    if (
      !name ||
      !email ||
      !newPassword ||
      !currentPassword ||
      !newConfirmPassword
    ) {
      // return res.send("Fill in all required fields");
      return next(new HttpError("Fill in all required fields", 404));
    }
    // get the user from Database
    const user = await User.findById(req.user.user.id);
    // console.log(req.user);
    if (!user) {
      // return res.send("User not found");
      return next(new HttpError("User not found", 404));
    }
    // make sure new email doesn't already exist
    const emailExist = await User.findOne({ email });
    // we want to update other details with or without changing the email
    if (emailExist && emailExist._id !== req.user.id) {
      // return res.send("Email already exists.");
      return next(new HttpError("Email already exists.", 404));
    }
    // compare  current password to db password
    const validUserPassword = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!validUserPassword) {
      // return res.send("Invalid current password");
      return next(new HttpError("Invalid current password", 404));
    }
    // compare new password
    if (newPassword !== newConfirmPassword) {
      // return res.send("new passwords do not match");
      return next(new HttpError("new passwords do not match", 404));
    }
    const Hash = await bcrypt.hash(newPassword, 10);
    const newInfo = await User.findByIdAndUpdate(
      req.user.user.id,
      { name, email, password: Hash },
      { new: true }
    );
    res.status(200).json(newInfo);
  } catch (error) {
    // res.send(error.message);
    return next(new HttpError(error, 404));
  }
};

const getAuthers = async (req, res, next) => {
  try {
    const authers = await User.find().select("-password");
    res.json(authers);
  } catch (error) {
    // return res.send(error.message);
    return next(new HttpError(error, 404));
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUser,
  changeAvatar,
  EditUser,
  getAuthers,
};
