import React from 'react'
import { inRange, isHost } from '../../services/validation.service'

const schema = { name: 'A3ITAHO' }
schema.form = {
  A3ITAHOSettings: {
    type: 'OIbTitle',
    label: 'A3ITAHO settings',
    md: 12,
    children: (
        <p>
          A3ITAHO TODO.
        </p>
    ),
  },
  host: {
    type: 'OIbText',
    defaultValue: '127.0.0.1',
    valid: isHost(),
    help: <div>IP address of the TAHO source</div>,
  },
  port: {
    type: 'OIbInteger',
    newRow: false,
    valid: inRange(1, 65535),
    defaultValue: 9999,
    help: <div>Port number of the TAHO</div>,
  },
}
schema.category = 'IoT'

export default schema
