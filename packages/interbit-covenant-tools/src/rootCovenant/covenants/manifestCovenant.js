const Immutable = require('seamless-immutable')
const hashObject = require('../hash')
const {
  remoteRedispatch,
  redispatch,
  selectors: { covenantHash }
} = require('../../coreCovenant')
const { PATHS } = require('../constants')

const prefix = '@@MANIFEST'

const actionTypes = {
  SET_MANIFEST: `${prefix}/SET_MANIFEST`
}

const actionCreators = {
  setManifest: manifest => ({
    type: actionTypes.SET_MANIFEST,
    payload: {
      manifest
    }
  })
}

const initialState = Immutable.from({}).setIn(PATHS.MANIFEST, {})

const reducer = (state = initialState, action) => {
  let nextState = state

  switch (action.type) {
    case actionTypes.SET_MANIFEST: {
      const { manifest } = action.payload

      // chainId property is only available within subtree manifests, whereas the
      // root receives ALL manifests, and doesn't have chainId at the top lvl
      const isRootChain = !manifest.chainId

      if (isRootChain && !verifyManifestHash(manifest)) {
        return nextState
      }

      const ownManifest = isRootChain
        ? Object.values(manifest.manifest)[0]
        : manifest

      const isManifestOwn = ownManifest.chainId === state.interbit.chainId
      if (!isManifestOwn) {
        throw new Error('This chain is not a part of the manifest')
      }

      if (!verifyManifestHash(ownManifest)) {
        return nextState
      }

      nextState = redispatchManifest(state, ownManifest)
      nextState = applyChanges(nextState, action, ownManifest)

      return nextState.setIn(PATHS.MANIFEST, manifest)
    }

    default:
      return state
  }
}

const applyChanges = (state, action, newManifest) => {
  const nextState = state
  const manifest = state.manifest
  // check for own covenant alias change
  console.log(newManifest)
  const isCovenantAliasChanged = newManifest

  const currCovenantHash = covenantHash(state)
  console.log(currCovenantHash)
  // check for existing covenant hash update
  // check for own acl update
  // check for own join updates

  return nextState
}

const verifyManifestHash = manifest => {
  const verifiableManifest = { ...manifest }
  delete verifiableManifest.hash
  const hash = hashObject(verifiableManifest)

  return hash === manifest.hash
}

const redispatchManifest = (state, manifestTree) => {
  let nextState = state
  const childEntries = Object.entries(manifestTree.chains)

  for (const [childAlias, childManifest] of childEntries) {
    const manifest = {
      [childAlias]: childManifest
    }
    const setManifestAction = actionCreators.setManifest(manifest)
    nextState = remoteRedispatch(
      nextState,
      childManifest.chainId,
      setManifestAction
    )
  }

  return nextState
}

module.exports = {
  actionTypes,
  actionCreators,
  initialState,
  reducer
}
