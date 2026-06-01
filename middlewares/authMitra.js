/**
 * Middleware to check if the partner (mitra) is authenticated via PIN.
 */
function isMitra(req, res, next) {
  if (req.session && req.session.partnerId) {
    return next();
  }
  
  // If not authenticated, redirect to partner login portal
  // The route for the login page can be customized, e.g., '/portal/login'
  if (req.xhr || req.headers.accept.indexOf('json') > -1) {
    return res.status(401).json({ message: "Unauthorized: Partner session expired or invalid." });
  }
  res.redirect("/login-mitra");
}

module.exports = {
  isMitra
};
