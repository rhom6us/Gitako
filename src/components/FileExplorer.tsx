import { Text } from '@primer/components'
import { LoadingIndicator } from 'components/LoadingIndicator'
import { Node } from 'components/Node'
import { SearchBar } from 'components/SearchBar'
import { useConfigs } from 'containers/ConfigsContext'
import { connect } from 'driver/connect'
import { FileExplorerCore } from 'driver/core'
import { ConnectorState, Props } from 'driver/core/FileExplorer'
import { platform } from 'platforms'
import * as React from 'react'
import { FixedSizeList, ListChildComponentProps } from 'react-window'
import { cx } from 'utils/cx'
import { focusFileExplorer } from 'utils/DOMHelper'
import { useOnLocationChange } from 'utils/hooks/useOnLocationChange'
import { useOnPJAXDone } from 'utils/hooks/usePJAX'
import { VisibleNodes } from 'utils/VisibleNodesGenerator'
import { Icon } from './Icon'
import { SearchMode, searchModes } from './searchModes'
import { SizeObserver } from './SizeObserver'

type renderNodeContext = {
  onNodeClick: (event: React.MouseEvent<HTMLElement, MouseEvent>, node: TreeNode) => void
  renderLabelText: (node: TreeNode) => React.ReactNode
  renderActions: ((node: TreeNode) => React.ReactNode) | undefined
  visibleNodes: VisibleNodes
}

const RawFileExplorer: React.FC<Props & ConnectorState> = function RawFileExplorer(props) {
  const {
    state,
    visibleNodes,
    visibleNodesGenerator,
    freeze,
    onNodeClick,
    searchKey,
    updateSearchKey,
    onFocusSearchBar,
    goTo,
    handleKeyDown,
    toggleShowSettings,
    metaData,
    expandTo,
    setUpTree,
    treeRoot,
    defer,
    searched,
  } = props
  const {
    value: { accessToken, compressSingletonFolder, searchMode },
  } = useConfigs()

  const onSearch = React.useCallback(
    (searchKey: string, searchMode: SearchMode) => {
      updateSearchKey(searchKey)
      if (visibleNodesGenerator) {
        visibleNodesGenerator.search(searchModes[searchMode].getSearchParams(searchKey))
      }
    },
    [updateSearchKey, visibleNodesGenerator],
  )

  React.useEffect(() => {
    if (treeRoot) {
      setUpTree({
        treeRoot,
        metaData,
        config: {
          compressSingletonFolder,
          accessToken,
        },
      })
    }
  }, [setUpTree, treeRoot, metaData, compressSingletonFolder, accessToken])

  React.useEffect(() => {
    if (visibleNodes?.focusedNode) focusFileExplorer()
  })

  const renderActions: ((node: TreeNode) => React.ReactNode) | undefined = React.useMemo(() => {
    const renderGoToButton = (node: TreeNode): React.ReactNode => (
      <button
        title={'Reveal in file tree'}
        className={'go-to-button'}
        onClick={e => {
          e.stopPropagation()
          e.preventDefault()
          goTo(node.path.split('/'))
        }}
      >
        <Icon type="go-to" />
      </button>
    )
    const renderFindInFolderButton = (node: TreeNode): React.ReactNode =>
      node.type === 'tree' ? (
        <button
          title={'Find in folder...'}
          className={'find-in-folder-button'}
          onClick={e => {
            e.stopPropagation()
            e.preventDefault()
            onSearch(node.path + '/', searchMode)
          }}
        >
          <Icon type="search" />
        </button>
      ) : undefined

    const renders: ((node: TreeNode) => React.ReactNode)[] = []
    if (searchMode === 'fuzzy') renders.push(renderFindInFolderButton)
    if (searched) renders.push(renderGoToButton)

    return renders.length
      ? node => renders.map((render, i) => <React.Fragment key={i}>{render(node)}</React.Fragment>)
      : undefined
  }, [goTo, onSearch, searched, searchMode])

  const renderLabelText = React.useCallback(
    node => searchModes[searchMode].renderNodeLabelText(node, searchKey),
    [searchKey, searchMode],
  )

  const renderNodeContext: renderNodeContext | null = React.useMemo(
    () =>
      visibleNodes && {
        onNodeClick,
        renderActions,
        renderLabelText,
        visibleNodes,
      },
    [onNodeClick, renderActions, renderLabelText, visibleNodes],
  )

  return (
    <div
      className={cx(`file-explorer`, { freeze })}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      onClick={freeze ? toggleShowSettings : undefined}
    >
      {state !== 'done' ? (
        <LoadingIndicator
          text={
            {
              pulling: 'Fetching File List...',
              rendering: 'Rendering File List...',
            }[state]
          }
        />
      ) : (
        visibleNodes &&
        renderNodeContext && (
          <>
            <SearchBar value={searchKey} onSearch={onSearch} onFocus={onFocusSearchBar} />
            {searched && visibleNodes.nodes.length === 0 && (
              <>
                <Text marginTop={6} textAlign="center" color="text.gray">
                  No results found.
                </Text>
                {defer && (
                  <Text textAlign="center" color="gray.4" fontSize="12px">
                    Lazy mode is ON. Search results are limited to loaded folders.
                  </Text>
                )}
              </>
            )}
            <SizeObserver className={'files'}>
              {({ width = 0, height = 0 }) => (
                <ListView
                  height={height}
                  width={width}
                  renderNodeContext={renderNodeContext}
                  expandTo={expandTo}
                  metaData={metaData}
                />
              )}
            </SizeObserver>
          </>
        )
      )}
    </div>
  )
}

RawFileExplorer.defaultProps = {
  freeze: false,
  state: 'pulling',
  searchKey: '',
  visibleNodes: null,
}

export const FileExplorer = connect(FileExplorerCore)(RawFileExplorer)

const VirtualNode = React.memo(function VirtualNode({
  index,
  style,
  data: { onNodeClick, renderLabelText, renderActions, visibleNodes },
}: Override<ListChildComponentProps, { data: renderNodeContext }>) {
  if (!visibleNodes) return null

  const { nodes, focusedNode, expandedNodes, loading, depths } = visibleNodes as VisibleNodes
  const node = nodes[index]

  return (
    <Node
      style={style}
      key={node.path}
      node={node}
      depth={depths.get(node) || 0}
      focused={focusedNode?.path === node.path}
      loading={loading.has(node.path)}
      expanded={expandedNodes.has(node.path)}
      onClick={onNodeClick}
      renderLabelText={renderLabelText}
      renderActions={renderActions}
    />
  )
})

type ListViewProps = {
  height: number
  width: number
  renderNodeContext: renderNodeContext
} & Pick<Props, 'metaData'> &
  Pick<ConnectorState, 'expandTo'>

function ListView({ width, height, metaData, expandTo, renderNodeContext }: ListViewProps) {
  const { visibleNodes } = renderNodeContext
  const { focusedNode, nodes } = visibleNodes
  const listRef = React.useRef<FixedSizeList>(null)
  // the change of depths indicates switch into/from search state
  React.useEffect(() => {
    if (listRef.current && focusedNode?.path) {
      const index = nodes.findIndex(node => node.path === focusedNode.path)
      if (index !== -1) {
        listRef.current.scrollToItem(index, 'smart')
      }
    }
  }, [focusedNode, nodes])
  // For some reason, removing the deps array above results in bug:
  // If scroll fast and far, then clicking on items would result in redirect
  // Not know the reason :(

  const goToCurrentItem = React.useCallback(() => {
    const targetPath = platform.getCurrentPath(metaData.branchName)
    if (targetPath) expandTo(targetPath)
  }, [metaData.branchName])

  useOnLocationChange(goToCurrentItem)
  useOnPJAXDone(goToCurrentItem)

  return (
    <FixedSizeList
      ref={listRef}
      itemKey={(index, { visibleNodes }) => visibleNodes?.nodes[index]?.path}
      itemData={renderNodeContext}
      itemCount={visibleNodes.nodes.length}
      itemSize={37}
      height={height}
      width={width}
    >
      {VirtualNode}
    </FixedSizeList>
  )
}
