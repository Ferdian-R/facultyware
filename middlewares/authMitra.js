function isMitra(req, res, next) {
  if (req.session && req.session.partnerId) {
    return next();
  }
  
  
  
  if (req.xhr || req.headers.accept.indexOf('json') > -1) {
    return res.status(401).json({ message: "Unauthorized: Partner session expired or invalid." });
  }
  res.redirect("/login-mitra");
}

module.exports = {
  isMitra
};
