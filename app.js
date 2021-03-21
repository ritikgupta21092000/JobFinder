//jshint esversion: 6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const _ = require("lodash");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const findOrCreate = require("mongoose-findorcreate");

var postJobStatus = false;
var registerStatus = false;
var loginStatus = false;
var socialUsername = "";

const app = express();

app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(express.static("public"));
app.set("view engine", "ejs");

app.use(session({
  secret: "Our little secret",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb+srv://admin-ritik:Ritik@21@cluster0-ase9w.mongodb.net/jobfinderDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
mongoose.set("useCreateIndex", true);

const jobSchema = new mongoose.Schema({
  companyName: String,
  title: String,
  location: String,
  education: String,
  skills: String,
  experience: String,
  description: String,
});


const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  gender: String,
  email: String,
  phoneNo: String,
  location: String,
  username: String,
  password: String,
  googleId: String,
  facebookId: String
});

const applyJobSchema = new mongoose.Schema({
  fName: String,
  age: Number,
  resumeUrl: String
})

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const Job = new mongoose.model("job", jobSchema);
const User = new mongoose.model("user", userSchema);
const Apply = new mongoose.model("application", applyJobSchema);

passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "https://morning-island-46726.herokuapp.com/auth/google/jobs",
  userProfileUrl: "https://www.googleapis.com/oauth2/v3/userinfo"
},
  function (accessToken, refreshToken, profile, cb) {
    User.findOrCreate({
      googleId: profile.id,
      username: profile.displayName
    }, function (err, user) {
      return cb(err, user);
    });
  }
));

passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_APP_ID,
  clientSecret: process.env.FACEBOOK_APP_SECRET,
  callbackURL: "https://morning-island-46726.herokuapp.com/auth/facebook/jobs",
  enableProof: true
},
  function (accessToken, refreshToken, profile, cb) {
    User.findOrCreate({
      facebookId: profile.id,
      username: profile.displayName
    }, function (err, user) {
      return cb(err, user);
    });
  }
));

///////////////////////////All Get Method /////////////////////////

app.get('/auth/google',
  passport.authenticate('google', {
    scope: ['profile']
  }));

app.get('/auth/google/jobs',
  passport.authenticate('google', {
    failureRedirect: '/login'
  }),
  function (req, res) {
    // Successful authentication, redirect home.
    loginStatus = true;
    res.redirect('/jobs');
  });

app.get('/auth/facebook',
  passport.authenticate('facebook'));

app.get('/auth/facebook/jobs',
  passport.authenticate('facebook', {
    failureRedirect: '/login'
  }),
  function (req, res) {
    // Successful authentication, redirect home.
    loginStatus = true;
    res.redirect('/jobs');
  });


app.get("/", function (req, res) {
  if (postJobStatus) {
    postJobStatus = false;
    res.render("index", {
      jobStatus: "success"
    });
  } else {
    res.render("index", {
      jobStatus: "failure"
    });
  }
});

app.get("/index", function (req, res) {
  res.redirect("/");
});

app.get("/how-does-it-work", function (req, res) {
  res.render("how-does-it-work");
});

app.get("/resume", function (req, res) {
  res.render("resume");
});

app.get("/dashboard", function (req, res) {
  res.render("dashboard");
});

app.get("/post-job", function (req, res) {
  res.render("post-job");
});

app.get("/jobs", function (req, res) {
  if (req.isAuthenticated()) {
    if (loginStatus) {
      loginStatus = false;
      Job.find({}, function (err, foundJob) {
        res.render("jobs", {
          jobs: foundJob,
          user: req.user.username,
          logStatus: "success"
        });
      });
    } else {
      Job.find({}, function (err, foundJob) {
        res.render("jobs", {
          jobs: foundJob,
          user: req.user.username,
          logStatus: "failure"
        });
      });
    }
  } else {
    res.redirect("/signup");
  }

});

app.get("/about", function (req, res) {
  res.render("about");
});

app.get("/contact", function (req, res) {
  res.render("contact");
});

app.get("/companies", function (req, res) {
  Job.find({}, function (err, foundJob) {
    res.render("companies", {
      jobs: foundJob
    });
  });
});

app.get("/application-form", function (req, res) {
  res.render("applyForm");
});

app.get("/top-companies/:companyName", function (req, res) {
  comps = [];
  const requestedName = _.lowerCase(req.params.companyName);
  Job.find({}, function (err, foundJob) {
    foundJob.forEach(function (find) {
      const storedName = _.lowerCase(find.companyName);
      if (storedName === requestedName) {
        comps.push(find);
      }
    });
    res.render("comp", {
      comps: comps
    });
  });

});

app.get("/signup", function (req, res) {
  res.render("signup");
});

app.get("/signin", function (req, res) {
  if (registerStatus) {
    registerStatus = false;
    res.render("signin", {
      regStatus: "success"
    });
  } else {
    res.render("signin", {
      regStatus: "failure"
    });
  }
});

app.get("/logout", function (req, res) {
  req.logout();
  res.redirect("/");
});


///////////////// //////////All Post Method/////////////////////////////

app.post("/index", function (req, res) {
  const hire = req.body.hire;
  const work = req.body.work;
  if (hire === "I Want To Hire") {
    res.redirect("/post-job");
  } else {
    res.redirect("/jobs");
  }
});

app.post("/post-job", function (req, res) {
  const newJob = new Job({
    companyName: req.body.company_name,
    title: req.body.title,
    location: req.body.location,
    education: req.body.educ,
    skills: req.body.skills,
    experience: req.body.exp,
    description: req.body.description
  });
  newJob.save(function (err) {
    if (err) {
      console.log(err);
    } else {
      postJobStatus = true;
      res.redirect("/");
    }
  });
});

app.post("/application-form", function (req, res) {
  res.redirect("/application-form");
});

app.post("/signup", function (req, res) {
  const newUser = {
    firstName: req.body.fname,
    lastName: req.body.lname,
    gender: req.body.gender,
    email: req.body.email,
    phoneNo: req.body.phone_no,
    location: req.body.loc,
    username: req.body.uname
  };
  User.register(newUser, req.body.pass, function (err, user) {
    if (err) {
      console.log(err);
      res.redirect("/signup");
    } else {
      registerStatus = true;
      res.redirect("/signin");
    }
  });
});

app.post("/signin", function (req, res) {
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });
  req.login(user, function (err) {
    if (err) {
      res.redirect("/signin");
    } else {
      passport.authenticate("local")(req, res, function () {
        loginStatus = true;
        res.redirect("/jobs");
      });
    }
  });
});

app.post("/filter", function (req, res) {
  var category = req.body.category;
  var city = req.body.city;
  if (category === "" && city === "") {
    res.redirect("/jobs");
  } else if (category != "" && city === "") {
    res.redirect("/jobs/" + category);
  } else if (category === "" && city != "") {
    res.redirect("/jobs/city/" + city);
  } else {
    res.redirect("/jobs/" + category + "/" + city);
  }
});

app.post("/applyForJob", function (req, res) {
  const BucketName = "jobfinder3rbucket";
  accessKeyId = "ASIAYO6OH36RA5GSIUDZ";
  secretAccessKey = "weDneswsYQ1wxnHqmIXDcRanGbyUNPAjuKPw3FwR";
  let s3bucket = new AWS.S3({
    accessKeyId: accessKeyId,
    secretAccessKey: secretAccessKey,
    sessionToken: "FwoGZXIvYXdzEGYaDJAMdNXsctWdEVr3ESLIAUKRMF27O5qoTryyjEXtANCD0yD+MUWAv5/SrdtQ9LZY25oAaDcHpBMq8hOUMybP3ALIlhqxA/UBm6IF5MRnX/iZCY4wb8GU/bQII08VcGZx8h5QCOSxyHjunxoSzi6UPxhr4ktYpx5mg93zVgOAa7RdL9RqSehsW3FDA645ztHnxfTWo7w4kPte6i91/z1OoK25Q9w2tVNwX2SpdK5F2+dwbgCtAbZL5qGFysh4j/ngZPRvSc+FYXK+Hhm6HSV/IKNlhijg3t1FKKuH3YIGMi3NMzhDpZOXexT12hn5No7NRqvNyJW6Y3PgGRxSuWRMf0bfFAtqcbIxtF78EEI=",
    Bucket: BucketName
  });

  s3bucket.createBucket(function () {
    var params = {
      Bucket: BucketName,
      Key: req.files.fileName.name,
      Body: req.files.fileName.data,
    };
    s3bucket.upload(params, (err, data) => {
      if (err) {
        console.log(err);
      } else {
        console.log("Uploaded Successfully");
        console.log(data);
        const application = new Apply({
          fName: req.body.fname,
          age: req.body.age,
          resumeUrl: data.Location
        });
        application.save(function (err) {
          if (err) {
            console.log(err);
          } else {
            res.redirect("/");
          }
        })
      }
    })
  })

  console.log(req.files);
})

app.get("/jobs/:categoryName", function (req, res) {
  var requestedCategoryName = req.params.categoryName;
  Job.find({ education: requestedCategoryName }, function (err, foundJob) {
    if (err) {
      console.log(err);
    } else {
      res.render("filterCompanies", {
        jobs: foundJob,
        category: requestedCategoryName,
        city: ""
      });
    }
  });
});

app.get("/jobs/city/:cityName", function (req, res) {
  var requestedCityName = req.params.cityName;
  Job.find({ location: requestedCityName }, function (err, foundJob) {
    if (err) {
      console.log(err);
    } else {
      res.render("filterCompanies", {
        jobs: foundJob,
        category: "",
        city: requestedCityName
      });
    }
  });
});

app.get("/jobs/:categoryName/:cityName", function (req, res) {
  var requestedCategoryName = req.params.categoryName;
  var requestedCityName = req.params.cityName;
  Job.find({ education: requestedCategoryName, location: requestedCityName }, function (err, foundJob) {
    if (err) {
      console.log(err);
    } else {
      res.render("filterCompanies", {
        jobs: foundJob,
        category: requestedCategoryName,
        city: requestedCityName
      });
    }
  });
});

app.listen(process.env.PORT || 3000, function () {
  console.log("Server is running on port 3000");
});
