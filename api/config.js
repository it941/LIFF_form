module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    LIFF_ID: process.env.LIFF_ID || '',
    API_URL: process.env.API_URL || ''
  });
};
