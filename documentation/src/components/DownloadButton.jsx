import React from 'react'
import PropTypes from 'prop-types'

const DownloadButton = ({ children, link, color }) => (
  <div style={{
    marginBottom: '20px',
    marginTop: '10px',
    textAlign: 'center',
  }}
  >
    <a
      href={link}
      style={{
        backgroundColor: color,
        borderRadius: '10px',
        color: '#f5f5f5',
        padding: '10px',
        cursor: 'pointer',
        minWidth: '10rem',
        textAlign: 'center',
      }}
    >
      {children}
    </a>
  </div>
)

DownloadButton.propTypes = {
  link: PropTypes.string.isRequired,
  color: PropTypes.string,
  children: PropTypes.object.isRequired,
}

DownloadButton.defaultProps = { color: '#009ee0' }

export default DownloadButton
