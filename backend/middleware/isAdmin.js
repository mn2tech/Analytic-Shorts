const getAdminEmails = () =>
  process.env.ADMIN_EMAILS
    ? process.env.ADMIN_EMAILS.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
    : ['admin@nm2tech-sas.com', 'demo@nm2tech-sas.com']

function isAdmin(req, res, next) {
  const adminEmails = getAdminEmails()
  const email = req.user?.email?.toLowerCase()
  if (!email || !adminEmails.includes(email)) {
    return res.status(403).json({ error: 'Admin access required' })
  }
  next()
}

module.exports = { isAdmin, getAdminEmails }
