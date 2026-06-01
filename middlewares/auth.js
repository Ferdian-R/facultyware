// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
  if (req.session.userId) {
    return next();
  }
  res.redirect("/login");
}

// Middleware to check if user is authenticated specifically as Admin
function isAdmin(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  res.redirect("/login");
}

module.exports = {
  isAuthenticated,
  isAdmin
};
