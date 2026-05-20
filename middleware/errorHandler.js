const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  if (req.accepts('html')) {
    return res.status(statusCode).render('error', {
      layout: 'layouts/main',
      message: err.message || 'Something went wrong',
      status: statusCode
    });
  }
  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack
  });
};

module.exports = errorHandler;
