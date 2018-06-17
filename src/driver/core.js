import link from './link'

import DOMHelper, { REPO_TYPE_PRIVATE } from '../utils/DOMHelper'
import GitHubHelper, { NOT_FOUND, BAD_CREDENTIALS } from '../utils/GitHubHelper'
import storageHelper from '../utils/storageHelper'
import URLHelper from '../utils/URLHelper'
import keyHelper from '../utils/keyHelper'

const init = dispatch => async () => {
  try {
    DOMHelper.decorateGitHubPageContent()
    const metaData = URLHelper.parse()
    dispatch(setMetaData, metaData)
    const [accessToken, shortcut] = await Promise.all([
      storageHelper.getAccessToken(),
      storageHelper.getShortcut(),
    ])
    dispatch({ hasAccessToken: Boolean(accessToken), toggleShowSideBarShortcut: shortcut })
    const metaDataFromAPI = await GitHubHelper.getRepoMeta({ ...metaData, accessToken })
    const branchName = metaData.branchName || metaDataFromAPI['default_branch']
    Object.assign(metaData, { branchName, api: metaDataFromAPI })
    dispatch(setMetaData, metaData)
    const shouldShow = URLHelper.isInCodePage(metaData)
    dispatch(setShouldShow, shouldShow)
    if (shouldShow) {
      DOMHelper.mountTopProgressBar()
    }
    const treeData = await GitHubHelper.getTreeData({ ...metaData, accessToken })
    dispatch({ logoContainerElement: DOMHelper.insertLogo() })
    dispatch({ treeData })
    if (shouldShow) {
      DOMHelper.unmountTopProgressBar()
    }
  } catch (err) {
    // TODO: detect request time exceeds limit
    if (err.message === NOT_FOUND || err.message === BAD_CREDENTIALS) {
      const repoPageType = await DOMHelper.getRepoPageType()
      const errorDueToAuth = repoPageType === REPO_TYPE_PRIVATE || err.message === BAD_CREDENTIALS
      dispatch({
        showSettings: repoPageType !== null,
        errorDueToAuth,
      })
      dispatch(setShouldShow, errorDueToAuth)
    } else {
      console.error(err)
      dispatch(setShouldShow, false)
    }
  }
}

const onPJAXEnd = dispatch => () => {
  dispatch(({ metaData }) => {
    DOMHelper.unmountTopProgressBar()
    DOMHelper.decorateGitHubPageContent()
    DOMHelper.focusSearchInput()
    const mergedMetaData = { ...metaData, ...URLHelper.parse() }
    dispatch(setShouldShow, URLHelper.isInCodePage(mergedMetaData))
    dispatch(setMetaData, mergedMetaData)
  })
}

const onKeyDown = dispatch => e => {
  dispatch(({ toggleShowSideBarShortcut }) => {
    if (toggleShowSideBarShortcut) {
      const keys = keyHelper.parseEvent(e)
      if (keys === toggleShowSideBarShortcut) {
        dispatch(toggleShowSideBar)
      }
    }
  })
}

const toggleShowSideBar = dispatch => () => dispatch(({ shouldShow }) => dispatch(setShouldShow, !shouldShow))

const setShouldShow = dispatch => shouldShow => {
  dispatch({ shouldShow })
  DOMHelper.setBodyIndent(shouldShow)
}

const onResize = dispatch => size => dispatch({ size })

const toggleShowSettings = dispatch => () => dispatch(({ showSettings }) => ({ showSettings: !showSettings }))

const onHasAccessTokenChange = dispatch => hasAccessToken => dispatch({ hasAccessToken })

const onShortcutChange = dispatch => shortcut => dispatch({ toggleShowSideBarShortcut: shortcut })

const setMetaData = dispatch => metaData => dispatch({ metaData })

export default function(instance) {
  return link(instance.setState.bind(instance), {
    init,
    onPJAXEnd,
    onKeyDown,
    setShouldShow,
    toggleShowSideBar,
    toggleShowSettings,
    onHasAccessTokenChange,
    onShortcutChange,
    onResize,
    setMetaData,
  })
}