// @ts-nocheck
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const querystring = require("querystring");
const cloudinary = require("cloudinary").v2;
const formidable = require("formidable");
const fetch = require("node-fetch");
const sendToken = require("../utils/jwtToken");
const pool = require("../start/db.start");
const { compare, genSaltSync, hash } = require("bcryptjs");

const userProfile = async (req, res, next) => {
  try {
    const db = await pool();

    const q = "SELECT * FROM Users WHERE id = ?";

    db.query(q, [req.user.id], (err, data) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Database error", error: err.toString() });
      }
      if (data.length === 0) {
        return res.status(400).json({
          isError: true,
          message: "User not found!.",
        });
      }

      const { user_password, ...user } = data[0];

      // .cookie("user", JSON.stringify(user), {
      //   expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      //   sameSite: "none",
      //   secure: true,
      //   httpOnly: false,
      // })
      return res.status(201).json({
        user,
        isError: false,
      });
    });
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const { name, about } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      const error = new Error("user not found");
      next(error);
    }

    user.name = name || user.name;
    user.about = about || user.about;
    await user.save();

    return res.json({
      user,
    });
  } catch (error) {
    next(error);
  }
};

const logoutUser = async (req, res, next) => {
  try {
    return res
      .cookie("token", null, {
        expires: new Date(Date.now()),
      })
      .status(201)
      .json({
        isError: false,
        message: "Logout successful!",
      });
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
};

const redirectURI = "api/users/auth/google";

const getLoginUrl = (req, res, next) => {
  try {
    const rootUrl = "https://accounts.google.com/o/oauth2/v2/auth";
    const options = {
      redirect_uri: `http://localhost:8000/${redirectURI}`,
      client_id: process.env.GOOGLE_CLIENT_ID,
      access_type: "offline",
      response_type: "code",
      prompt: "consent",
      scope: [
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/userinfo.email",
      ].join(" "),
    };

    res.send(`${rootUrl}?${querystring.stringify(options)}`);
  } catch (error) {
    next(error);
  }
};

async function getTokens({ code, clientId, clientSecret, redirectUri, next }) {
  try {
    /*
     * Uses the code to get tokens
     * that can be used to fetch the user's profile
     */
    const url = "https://oauth2.googleapis.com/token";
    const values = {
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    };

    const response = await fetch(url, {
      method: "POST",
      body: querystring.stringify(values),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const { id_token, access_token } = await response.json();

    return {
      id_token,
      access_token,
    };
  } catch (error) {
    next(error);
  }
}

// Getting the user from Google with the code
const userFromGoogle = async (req, res, next) => {
  try {
    const code = req.query.code;

    const { id_token, access_token } = await getTokens({
      code,
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: `${process.env.SERVER_ROOT_URI}/${redirectURI}`,
      next: next,
    });

    // Fetch the user's profile with the access token and bearer
    const response = await fetch(
      `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${access_token}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${id_token}`,
        },
      }
    );

    const googleUser = await response.json();

    let user = await User.findOne({ email: googleUser.email });

    if (user && user.provider !== "google") {
      next(
        new Error(
          `You already have an account with ${user.provider} provider! Please Login with ${user.provider} to continue.`
        )
      );
    }

    if (!user) {
      user = await User.create({
        provider: "google",
        email: googleUser.email,
        name: googleUser.name,
        avatar: googleUser.picture,
        password: googleUser.id,
      });

      // console.log("new user created.");
      const token = jwt.sign(
        { id: user._id.toString() },
        process.env.JWT_SECRET,
        {
          expiresIn: process.env.JWT_EXPIRES,
        }
      );

      return res
        .status(201)
        .cookie("token", token, {
          expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          sameSite: "none",
          secure: true,
          httpOnly: true,
        })
        .redirect(process.env.UI_ROOT_URI);
    }

    const token = jwt.sign(
      { id: user._id.toString() },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES,
      }
    );

    return res
      .status(201)
      .cookie("token", token, {
        expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        sameSite: "none",
        secure: true,
        httpOnly: false,
      })
      .redirect(process.env.UI_ROOT_URI);
  } catch (error) {
    next(error);
  }
};

// github authentication
const getGithubAuthUrl = (req, res, next) => {
  try {
    const rootURl = "https://github.com/login/oauth/authorize";

    const { from } = req.query;

    const options = {
      client_id: process.env.GITHUB_CLIENT_ID,
      redirect_uri: process.env.GITHUB_REDIRECT_URL,
      scope: "user:email",
      state: from,
    };

    res.send(`${rootURl}?${querystring.stringify(options)}`);
  } catch (error) {
    next(error);
  }
};

async function getGithubTokens({
  code,
  clientId,
  clientSecret,
  redirectUri,
  next,
}) {
  try {
    const url = "https://github.com/login/oauth/access_token";
    const values = {
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    };

    const response = await fetch(url, {
      method: "POST",
      body: JSON.stringify(values),
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    const { access_token } = await response.json();

    return {
      access_token,
    };
  } catch (error) {
    next(error);
  }
}

// Getting the user from Github with the code
const userFromGithub = async (req, res, next) => {
  try {
    const { code } = req.query;

    const githubRedirectURI = "api/users/auth/github";

    const { access_token } = await getGithubTokens({
      code,
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      redirectUri: `${process.env.SERVER_ROOT_URI}/${githubRedirectURI}`,
      next: next,
    });

    const url = "https://api.github.com/user";
    const response = await fetch(url, {
      headers: {
        Authorization: `token ${access_token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    const githubUser = await response.json();

    const emailResponse = await fetch("https://api.github.com/user/emails", {
      headers: {
        Authorization: `token ${access_token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    const emails = await emailResponse.json();
    const primaryEmail = emails.find((email) => email.primary);

    if (primaryEmail) {
      githubUser.email = primaryEmail.email;
    }

    let user = await User.findOne({ email: githubUser.email });

    if (user && user.provider !== "github") {
      next(
        new Error(
          `You already have an account with ${user.provider} provider! Please Login with ${user.provider} to continue.`
        )
      );
    }

    if (!user) {
      user = await User.create({
        provider: "github",
        email: githubUser.email,
        name: githubUser.name,
        avatar: githubUser.avatar_url,
        password: githubUser.id,
      });

      // console.log("new user created.");
      const token = jwt.sign(
        { id: user._id.toString() },
        process.env.JWT_SECRET,
        {
          expiresIn: process.env.JWT_EXPIRES,
        }
      );

      return res
        .status(201)
        .cookie("token", token, {
          expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          sameSite: "none",
          secure: true,
          httpOnly: true,
        })
        .redirect(process.env.UI_ROOT_URI);
    }

    const token = jwt.sign(
      { id: user._id.toString() },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES,
      }
    );

    return res
      .status(201)
      .cookie("token", token, {
        expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        sameSite: "none",
        secure: true,
        httpOnly: false,
      })
      .redirect(process.env.UI_ROOT_URI);
  } catch (error) {
    next(error);
  }
};

const signup = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        isError: false,
        message: "Please provide all values.",
      });
    }

    const db = await pool();

    const q = "SELECT * FROM Users WHERE email = ?";

    db.query(q, [email], async (err, data) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Database error", error: err.toString() });
      }
      if (data.length) {
        return res.status(400).json({
          isError: true,
          message: "You already have an account! Please Login to continue.",
        });
      }

      // Hash the password and create a user
      const hashPassword = await hash(password, 12);

      const q =
        "INSERT INTO Users(`user_name`,`email`,`user_password`) VALUES (?)";
      const values = [name, email, hashPassword];

      db.query(q, [values], (err, data) => {
        if (err) {
          return res
            .status(500)
            .json({ message: "Database error", error: err.toString() });
        }

        const q = "SELECT * FROM Users WHERE email = ?";

        db.query(q, [email], async (err, data) => {
          if (err) {
            return res
              .status(500)
              .json({ message: "Database error", error: err.toString() });
          }
          if (data) {
            return sendToken(data[0], 201, res);
          }
        });
      });
    });
  } catch (error) {
    next(error);
  }
};

const signin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        isError: false,
        message: "Please provide all values.",
      });
    }

    const db = await pool();

    const q = "SELECT * FROM Users WHERE email = ?";

    db.query(q, [email], (err, data) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Database error", error: err.toString() });
      }
      if (data.length === 0) {
        return res.status(400).json({
          isError: true,
          message: "User not found!.",
        });
      }

      //Check password
      const isPasswordCorrect = compare(password, data[0].user_password);

      if (!isPasswordCorrect) {
        return res.status(400).json({
          isError: true,
          message: "Wrong username or password!",
        });
      }

      return sendToken(data[0], 201, res);
    });
  } catch (error) {
    next(error);
  }
};

const uploadProfilePic = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const regex = new RegExp(/\/v\d+\/([^/]+)\.\w{3,4}$/);

    if (user.avatar.includes("https://lh3.googleusercontent.com")) {
      user.avatar = "";
      await user.save();
    } else if (user.avatar) {
      const getPublicIdFromUrl = (url) => {
        const match = url.match(regex);
        return match ? match[1] : null;
      };
      const publicId = getPublicIdFromUrl(user.avatar);

      cloudinary.uploader.destroy(`${publicId}`, function (error, result) {
        console.log(result, error);
        if (error) {
          next(error);
        }
      });

      user.avatar = "";
      await user.save();
    }

    const form = formidable();
    form.parse(req, async (err, fields, files) => {
      if (err) {
        next(err);
      }
      if (files) {
        const { secure_url } = await cloudinary.uploader.upload(
          files.avatar.filepath,
          {
            width: 1920,
            crop: "scale",
          }
        );
        user.avatar = secure_url;
      }
      await user.save();
      return res
        .status(200)
        .json({ message: "Image uploaded successfully!", user });
    });
  } catch (err) {
    res.send(err);
  }
};

const removeProfilePic = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const fullurl = req.params.id;
    const regex = new RegExp(/\/v\d+\/([^/]+)\.\w{3,4}$/);

    // console.log(fullurl);
    if (fullurl.includes("https://lh3.googleusercontent.com")) {
      user.avatar = "";
      await user.save();
    } else if (fullurl) {
      const getPublicIdFromUrl = (url) => {
        const match = url.match(regex);
        return match ? match[1] : null;
      };
      const publicId = getPublicIdFromUrl(fullurl);

      cloudinary.uploader.destroy(`${publicId}`, function (error, result) {
        console.log(result, error);
        if (error) {
          next(error);
        }
      });

      user.avatar = "";
      await user.save();
    }

    return res
      .status(200)
      .json({ message: "Image removed successfully!", user, fullurl });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getLoginUrl,
  userFromGoogle,
  userProfile,
  updateProfile,
  logoutUser,
  uploadProfilePic,
  removeProfilePic,
  getGithubAuthUrl,
  userFromGithub,
  signup,
  signin,
};
