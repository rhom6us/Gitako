import React from 'react'
import PropTypes from 'prop-types'

import Icon from './Icon'
import configHelper, { config } from '../utils/configHelper'
import keyHelper from '../utils/keyHelper'

const wikiLinks = {
  compressSingletonFolder: 'https://github.com/EnixCoda/Gitako/wiki/Compress-Singleton-Folder',
}

const ACCESS_TOKEN_REGEXP = /^[0-9a-f]{40}$/

const OperatingSystems = {
  Windows: 'Windows',
  macOS: 'Macintosh',
  others: 'unknown',
}

function detectOS() {
  const {
    navigator: { userAgent },
  } = window
  if (userAgent.indexOf(OperatingSystems.Windows) !== -1) return OperatingSystems.Windows
  else if (userAgent.indexOf(OperatingSystems.macOS) !== -1) return OperatingSystems.macOS
  return OperatingSystems.others
}

function friendlyFormatShortcut(shortcut) {
  if (typeof shortcut !== 'string') return ''
  const OS = detectOS()
  if (OS === OperatingSystems.Windows) {
    return shortcut.replace(/meta/, 'win')
  } else if (OS === OperatingSystems.macOS) {
    return shortcut
      .replace(/meta/, '⌘')
      .replace(/ctrl/, '⌃')
      .replace(/shift/, '⇧')
      .replace(/alt/, '⌥')
      .toUpperCase()
  } else {
    return shortcut
  }
}

export default class SettingsBar extends React.PureComponent {
  static propTypes = {
    accessToken: PropTypes.string.isRequired,
    activated: PropTypes.bool.isRequired,
    compressSingletonFolder: PropTypes.bool.isRequired,
    onAccessTokenChange: PropTypes.func.isRequired,
    onShortcutChange: PropTypes.func.isRequired,
    setCompressSingleton: PropTypes.func.isRequired,
    toggleShowSettings: PropTypes.func.isRequired,
    toggleShowSideBarShortcut: PropTypes.string.isRequired,
  }

  state = {
    accessToken: '',
    accessTokenHint: '',
    shortcutHint: '',
    toggleShowSideBarShortcut: '',
    compressHint: '',
  }

  componentWillMount() {
    const { toggleShowSideBarShortcut, compressSingletonFolder } = this.props
    this.setState({ toggleShowSideBarShortcut, compressSingletonFolder })
  }

  componentWillReceiveProps({ toggleShowSideBarShortcut, compressSingletonFolder }) {
    this.setState({ toggleShowSideBarShortcut, compressSingletonFolder })
  }

  onInputAccessToken = event => {
    const value = event.target.value
    this.setState({
      accessToken: value,
      accessTokenHint: ACCESS_TOKEN_REGEXP.test(value) ? '' : 'This token is in unknown format.',
    })
  }

  saveToken = async () => {
    const { onAccessTokenChange } = this.props
    const { accessToken } = this.state
    if (accessToken) {
      await configHelper.setOne(config.accessToken, accessToken)
      onAccessTokenChange(accessToken)
      this.setState({
        accessToken: '',
        accessTokenHint: 'Your token is saved, will work after reloading the page!',
      })
    }
  }

  clearToken = async () => {
    const { onAccessTokenChange } = this.props
    await configHelper.setOne(config.accessToken, '')
    onAccessTokenChange('')
    this.setState({ accessToken: '' })
  }

  saveShortcut = async () => {
    const { onShortcutChange } = this.props
    const { toggleShowSideBarShortcut } = this.state
    await configHelper.setOne(config.shortcut, toggleShowSideBarShortcut)
    onShortcutChange(toggleShowSideBarShortcut)
    this.setState({
      shortcutHint: 'Shortcut is saved!',
    })
  }

  /**
   * @param {KeyboardEvent} e
   */
  onShortCutInputKeyDown = e => {
    e.preventDefault()
    const shortcut = keyHelper.parseEvent(e)
    this.setState({ toggleShowSideBarShortcut: shortcut })
  }

  setCompressSingletonFolder = async e => {
    const compress = e.target.checked
    await configHelper.setOne(config.compressSingletonFolder, compress)
    const { setCompressSingleton } = this.props
    setCompressSingleton(compress)
    this.setState({
      compressHint: 'Saved, reload page to apply!',
    })
  }

  render() {
    const { accessTokenHint, toggleShowSideBarShortcut, compressSingletonFolder, shortcutHint, accessToken, compressHint } = this.state
    const { toggleShowSettings, activated, accessToken: hasAccessToken } = this.props
    return (
      <div className={'gitako-settings-bar'}>
        {activated && (
          <h3 className={'gitako-settings-bar-title'}>
            Settings
          </h3>
        )}
        {activated && (
          <div className={'gitako-settings-bar-content'}>
            <div className={'shadow-shelter'} />
            <div className={'gitako-settings-bar-content-section access-token'}>
              <h4>Access Token</h4>
              <span>With access token provided, Gitako can access more repositories.</span>
              <br />
              <a href="https://github.com/blog/1509-personal-api-tokens" target="_blank">
                Help: how to create access token?
              </a>
              <br />
              <span>
                Gitako stores the token in&nbsp;
                <a href="https://developer.chrome.com/apps/storage" target="_blank">
                  chrome local storage
                </a>
                &nbsp;locally and safely.
              </span>
              <br />
              <div className={'access-token-input-control'}>
                <input
                  className={'access-token-input form-control'}
                  disabled={hasAccessToken}
                  placeholder={hasAccessToken ? 'Your token is saved' : 'Input your token here'}
                  value={accessToken}
                  onInput={this.onInputAccessToken}
                />
                {hasAccessToken && !accessToken ? (
                  <button className={'btn'} onClick={this.clearToken}>
                    Clear
                  </button>
                ) : (
                  <button className={'btn'} onClick={this.saveToken} disabled={!accessToken}>
                    Save
                  </button>
                )}
              </div>
              {accessTokenHint && <span className={'hint'}>{accessTokenHint}</span>}
            </div>
            <div className={'gitako-settings-bar-content-section toggle-shortcut'}>
              <h4>Toggle shortcut</h4>
              <span>Set a combination of keys for toggling Gitako sidebar.</span>
              <br />
              <div className={'toggle-shortcut-input-control'}>
                <input
                  className={'toggle-shortcut-input form-control'}
                  placeholder={'focus here and press the shortcut keys'}
                  value={friendlyFormatShortcut(toggleShowSideBarShortcut)}
                  onKeyDown={this.onShortCutInputKeyDown}
                  readOnly
                />
                <button className={'btn'} onClick={this.saveShortcut}>
                  Save
                </button>
              </div>
              {shortcutHint && <span className={'hint'}>{shortcutHint}</span>}
            </div>
            <div className={'gitako-settings-bar-content-section singleton'}>
              <h5>
                Compress singleton folder&nbsp;
                <a href={wikiLinks.compressSingletonFolder} target={'_blank'}>(?)</a>
              </h5>
              <label htmlFor={'compress-singleton-folder'}>
                <input id={'compress-singleton-folder'} name={'compress-singleton-folder'} type={'checkbox'} onChange={this.setCompressSingletonFolder} checked={compressSingletonFolder} />
                &nbsp; {compressSingletonFolder ? 'enabled' : 'disabled'}
              </label>
              {compressHint && <div className={'hint'}>{compressHint}</div>}
            </div>
            <div className={'gitako-settings-bar-content-section position'}>
              <h5>Position of Gitako (WIP)</h5>
              <select value={'next to'} disabled>
                <option value="next to">next to main content</option>
              </select>
            </div>
            <div className={'gitako-settings-bar-content-section TOC'}>
              <h5>Table of Markdown Content (WIP)</h5>
              <label htmlFor={'toc'}>
                <input name={'toc'} type={'checkbox'} disabled />
                &nbsp; disabled
              </label>
            </div>
            <div className={'gitako-settings-bar-content-section issue'}>
              <h4>Issue</h4>
              <span>
                <a href="https://github.com/EnixCoda/Gitako/issues" target="_blank">
                  Draft a issue on Github
                </a>
                &nbsp;for bug report or feature request.
              </span>
            </div>
          </div>
        )}
        <div className={'placeholder-row'}>
          {activated ? (
            <Icon
              type={'chevron-down'}
              className={'hide-settings-icon'}
              onClick={toggleShowSettings}
            />
          ) : (
            <Icon type={'gear'} className={'show-settings-icon'} onClick={toggleShowSettings} />
          )}
        </div>
      </div>
    )
  }
}
