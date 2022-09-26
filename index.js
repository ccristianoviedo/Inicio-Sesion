import express from "express";
const app = express();
import cookieParser from "cookie-parser";
import session from "express-session";
import bcrypt from "bcrypt";
import passport from "passport";
import path from "path";
import { Strategy } from "passport-local";
const LocalStrategy = Strategy;
import "./src/db/config.js";
import { auth } from "./src/middelware/auth.js";
import mongoStore from "connect-mongo";
import handlebars from "express-handlebars";
import User from "./src/models/User.js";

app.use(cookieParser());
app.use(express.json())
app.use(express.urlencoded({extended: true}))

app.use(session({
  store: new mongoStore({
    mongoUrl:"mongodb://localhost/sessiones",
  }),
  secret:"coder",
  resave: false,
  saveUninitialized: false,
  cookie :{
    originalMaxAge:600000,
   }    
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new LocalStrategy((username, password, done) => {
    User.findOne({ username }, (err, user) => {
      if (err) console.log(err);
      if (!user) return done(null, false);
      bcrypt.compare(password, user.password, (err, isMatch) => {
        if (err) console.log(err);
        if (isMatch) return done(null, user);
        return done(null, false);
      });
    });
  })
);

passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  const user = await User.findById(id);
  return done(null, user);
});

app.engine(
  "hbs",
  handlebars.engine({
    extname: ".hbs",
    defaultLayout: "index.hbs",
    layoutsDir:  path.join(app.get("views"), "layouts"),
    
  })
);
app.set("view engine", "hbs"); // registra el motor de plantillas
app.set("views", "./views"); // especifica el directorio de vistas

const datos=[]

//GET

app.get("/", (req, res) => {
  if (req.session.nombre) {
    res.redirect("/main");
  } else {
    res.redirect("/login");
  }
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/loginError", (req, res) => {
  res.render("loginError");
});

app.post("/login",
  passport.authenticate("local", { failureRedirect: "login-error" }),
  (req, res) => {
    res.redirect("/datos");
  }
);

app.get("/register", (req, res) => {
  res.render("register");
});

app.post("/register", (req, res) => {
  const { username, password, direccion } = req.body;
  User.findOne({ username }, async (err, user) => {
    if (err) console.log(err);
    if (user) res.render("register-error");
    if (!user) {
      const hashedPassword = await bcrypt.hash(password, 8);
      const newUser = new User({
        username,
        password: hashedPassword,
        direccion,
      });
      await newUser.save();
      res.redirect("/login");
    }
  });
});

app.get("/datos", auth, async (req, res) => {
  const datosUsuario = await User.findById(req.user._id).lean();
  res.render("main", {
    datos: datosUsuario,
  });
});

app.get("/logout", (req, res) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

/*app.get("/in", auth, function (req, res) {
  res.render("main",{
    datos,
    user: req.session.user,
    pass: req.session.pass,
  });
});



app.get("/logout", (req, res)=> {
  res.render("logout", {user: req.session.user});
  req.session.destroy(err=>{
    if(err)
    return res.json({status: "logout error", body : err})
  })
});*/
app.listen(8080, () => console.log("Server up"));