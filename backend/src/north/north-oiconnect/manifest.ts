import { NorthConnectorManifest } from '../../../../shared/model/north-connector.model';
import { proxy } from '../../../../shared/model/manifest-factory';

const manifest: NorthConnectorManifest = {
  id: 'oiconnect',
  name: 'OIConnect',
  category: 'api',
  description: 'Send files and values to another OIBus',
  modes: {
    files: true,
    points: true
  },
  settings: [
    {
      key: 'host',
      type: 'OibText',
      label: 'Host',
      validators: [
        { key: 'required' },
        {
          key: 'pattern',
          params: { pattern: '^(http:\\/\\/|https:\\/\\/|HTTP:\\/\\/|HTTPS:\\/\\/).*' }
        }
      ],
      displayInViewMode: true
    },
    { key: 'timeout', type: 'OibNumber', label: 'Timeout', unitLabel: 's', defaultValue: 30, validators: [{ key: 'required' }] },
    {
      key: 'acceptUnauthorized',
      type: 'OibCheckbox',
      label: 'Accept unauthorized certificate',
      validators: [{ key: 'required' }],
      defaultValue: false,
      displayInViewMode: true
    },
    {
      key: 'username',
      type: 'OibText',
      label: 'Username',
      defaultValue: '',
      validators: [{ key: 'required' }],
      newRow: true,
      displayInViewMode: false
    },
    {
      key: 'password',
      type: 'OibSecret',
      label: 'Password',
      defaultValue: '',
      displayInViewMode: false
    },
    ...proxy
  ]
};

export default manifest;
