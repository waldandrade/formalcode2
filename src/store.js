import Vue from 'vue'
import Vuex from 'vuex'
import firebase from 'firebase/app'
import 'firebase/auth'
import 'firebase/storage'
import 'firebase/firestore'
import firebaseConfig from '@/firebase/'

firebase.initializeApp(firebaseConfig)

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    events: [],
    db: firebase.firestore(),
    selectedFile: null,
    specifications: [],
    openedSpecifications: [],
    libs: [],
    explore: false,
    user: {},
    pessoa: null,
    fotoPerfil: null,
    loading: false,
    loadingGeneral: null,
    error: null,
    headers: null,
    mini: false,
    raiz: null,
    internalLibraries: [
      {
        name: 'BASICNATURALNUMBER'
      },
      {
        name: 'BIT'
      },
      {
        name: 'BITNATREPR'
      },
      {
        name: 'BITSTRING'
      },
      {
        name: 'BOOLEAN'
      },
      {
        name: 'DECDIGIT'
      },
      {
        name: 'DECNATREPR'
      },
      {
        name: 'DECSTRING'
      },
      {
        name: 'HEXDIGIT'
      },
      {
        name: 'HEXNATREPR'
      },
      {
        name: 'HEXSTRING'
      },
      {
        name: 'INTEGERNUMBER'
      },
      {
        name: 'INTEGER'
      },
      {
        name: 'NATREPRESENTATIONS'
      },
      {
        name: 'NATURALNUMBER'
      },
      {
        name: 'OCTDIGIT'
      },
      {
        name: 'OCTET'
      },
      {
        name: 'OCTETSTRING'
      },
      {
        name: 'OCTNATREPR'
      },
      {
        name: 'OCTSTRING'
      }
    ]
  },
  mutations: {
    addLib (state, lib) {
      state.lib.push(lib)
    },
    addSpecification (state, specification) {
      state.specifications.push(specification)
    },
    setAuthHeader (state, payload) {
      state.headers = new Headers({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${payload}`
      })
    },
    setUser (state, payload) {
      state.user = payload
    },
    setLoading (state, payload) {
      state.loading = payload
    },
    setLoadingGeneral (state, payload) {
      state.loadingGeneral = payload
    },
    setError (state, payload) {
      state.error = payload
    },
    setUserImage (state, payload) {
      state.user.image = payload
    },
    clearError (state) {
      state.error = null
    },
    setSpecifications (state, payload) {
      state.specifications = payload
    },
    setExplore (state, payload) {
      state.explore = payload
    },
    openSpecification (state, specification) {
      state.openedSpecifications.push(specification)
      state.selectedFile = state.openedSpecifications.length - 1
    },
    updateSpecification (state, specification) {
      state.openedSpecifications = state.openedSpecifications.map((oldSpec) => {
        if (oldSpec.abstractName === specification.abstractName) {
          return specification
        } else {
          return oldSpec
        }
      })
    },
    closeSpecification (state, index) {
      state.openedSpecifications.splice(index, 1)
    },
    closeAllSpecification (state) {
      state.openedSpecifications = []
    },
    setSelectedFile (state, selectFile) {
      state.selectedFile = selectFile
    },
    setMini (state, mini) {
      state.mini = mini
    },
    setRaiz (state, raiz) {
      state.raiz = raiz
    },
    addEvent (state, event) {
      state.events.push(event)
    }
  },
  actions: {
    eventHappen ({ commit }, event) {
      // utilizar para registrar um log global
      commit('addEvent', event)
    },
    storeRaiz ({ commit }, raiz) {
      commit('setRaiz', raiz)
    },
    toggleMini ({ commit }, mini) {
      commit('setMini', mini)
    },
    selectFile ({ commit, state }, selectFile) {
      commit('setSelectedFile', selectFile)
    },
    fileUpload ({ commit, state }, payload) {
      return new Promise((resolve, reject) => {
        commit('setLoading', true)
        let storageRef = firebase.storage().ref()
        let fileRef = storageRef.child(`users/${state.user.id}/${payload.project}/${payload.file.name}`)
        fileRef.put(payload.file).then(snapshot => {
          snapshot.ref.getDownloadURL().then(downloadURL => {
            var reader = new FileReader()
            reader.readAsBinaryString(payload.file)
            reader.onloadend = function () {
              var specification = {
                url: downloadURL,
                name: snapshot.metadata.name,
                code: reader.result,
                abstractName: snapshot.metadata.fullPath,
                selfLink: downloadURL
              }
              commit('addSpecification', specification)
              resolve()
            }
          })
        })
      })
    },
    toggleExplore ({ commit, state }, explore) {
      commit('setExplore', explore)
    },
    carregarDados ({ commit, state }) {
      state.db.collection('users').doc(`${state.user.id}`).collection('specs').get().then((querySnapshot) => {
        console.log(querySnapshot)
        commit('setSpecifications', querySnapshot.docs.map((doc) => {
          return { ...doc.data(), id: doc.id }
        }))
      })
    },
    addLib ({ commit }, lib) {
      commit('addLib', lib)
    },
    openInternalLib ({ commit, state }, index) {
      var lib = state.internalLibraries[index]
      commit('setExplore', false)
      commit('setLoadingGeneral', 'Aguarde ...')
      var indexFindLib = 0
      var findLib = state.openedSpecifications.some((spec, index) => {
        indexFindLib = index
        return spec.abstractName === `${lib.name}.lib`
      })
      if (!findLib) {
        if (lib.code === undefined) {
          var xhr = new XMLHttpRequest()
          xhr.onload = function (event) {
            var blob = xhr.response
            lib.code = blob
            lib.isDirty = false
            commit('setLoadingGeneral', null)
            commit('openSpecification', lib)
          }
          xhr.open('GET', require(`./assets/libs/${lib.name}.lib`))
          xhr.send()
        } else {
          commit('openSpecification', lib)
        }
      } else {
        commit('setSelectedFile', indexFindLib)
      }
    },
    openSpecification ({ commit, state }, index) {
      var specification = state.specifications[index]

      commit('setExplore', false)
      commit('setLoadingGeneral', 'Aguarde ...')

      var indexFindSpecification = 0
      var findSpecification = state.openedSpecifications.some((spec, index) => {
        indexFindSpecification = index
        return spec.abstractName === specification.abstractName
      })

      if (!findSpecification) {
        if (specification.code === undefined) {
          var storage = firebase.storage()
          storage.ref(specification.abstractName).getDownloadURL().then((url) => {
            var xhr = new XMLHttpRequest()
            xhr.onload = function (event) {
              var blob = xhr.response
              specification.code = blob
              specification.isDirty = false
              commit('setLoadingGeneral', null)
              commit('openSpecification', specification)
            }
            xhr.open('GET', url)
            xhr.send()
          })
        } else {
          commit('openSpecification', specification)
        }
      } else {
        commit('setSelectedFile', indexFindSpecification)
      }
    },
    addSpecification ({ commit, state }, specification) {
      return new Promise((resolve, reject) => {
        commit('setLoading', true)
        let storageRef = firebase.storage().ref()
        let fileRef = storageRef.child(`users/${state.user.id}/geral/${specification.name}.lotos`)
        fileRef.putString(specification.code).then(snapshot => {
          snapshot.ref.getDownloadURL().then(downloadURL => {
            specification.url = downloadURL
            commit('addSpecification', specification)
            resolve()
          })
        })
      })
    },
    save ({ commit, state }, specification) {
      return new Promise((resolve, reject) => {
        commit('setLoading', true)
        var storage = firebase.storage()
        storage.ref(specification.abstractName).putString(specification.code).then(snapshot => {
          commit('updateSpecification', specification)
          resolve()
        })
      })
    },
    closeSpecification ({ commit }, index) {
      commit('closeSpecification', index)
    },
    clearError ({ commit }) {
      commit('clearError')
    },
    signUserUp ({ commit }, payload) {
      commit('setLoading', true)
      firebase.auth().createUserWithEmailAndPassword(payload.email, payload.password)
        .then(
          (userCred) => {
            const user = userCred.user
            commit('setLoading', false)
            const newUser = {
              id: user.uid,
              email: user.email,
              events: []
            }
            user.getIdToken().then(
              token => {
                commit('setUser', newUser)
                commit('setAuthHeader', token)
              }
            )
            // incluir os demais atributos que o usuário pode ter
            // Como postos que administra, perfil de cliente e perfil de frentista
          }
        )
        .catch(
          error => {
            commit('setLoading', false)
            commit('setError', error)
          }
        )
    },
    signUserIn ({ commit }, payload) {
      commit('setLoading', true)
      firebase.auth().signInWithEmailAndPassword(payload.email, payload.password)
        .catch(
          error => {
            commit('setLoading', false)
            commit('setError', error)
          }
        )
    },
    exitToApp ({ commit }) {
      firebase.auth().signOut()
      commit('setLoading', true)
      commit('setUser', null)
      commit('setAuthHeader', null)
      commit('setSelectedFile', null)
      commit('setSpecifications', [])
      commit('closeAllSpecification', [])
      // commit('libs', [])
    },
    userChanged ({ commit }, payload) {
      const user = payload
      commit('setLoading', false)
      if (user) {
        const newUser = {
          id: user.uid,
          email: user.email,
          image: null,
          events: []
        }

        user.getIdToken().then(
          token => {
            commit('setUser', newUser)
            commit('setAuthHeader', token)
          }
        )
      } else {
        commit('setUser', null)
        commit('setAuthHeader', null)
      }
      // incluir os demais atributos que o usuário pode ter
      // Como postos que administra, perfil de cliente e perfil de frentista
    }
  },
  getters: {
    events (state) {
      return state.events
    },
    headers (state) {
      return state.headers
    },
    user (state) {
      return state.user
    },
    loading (state) {
      return state.loading
    },
    loadingGeneral (state) {
      return state.loadingGeneral
    },
    error (state) {
      return state.error
    },
    specifications (state) {
      return state.specifications
    },
    openedSpecifications (state) {
      return state.openedSpecifications
    },
    libs (state) {
      return state.libs
    },
    internalLibraries (state) {
      return state.internalLibraries
    },
    explore (state) {
      return state.explore
    },
    selectedFile (state) {
      return state.selectedFile
    },
    mini (state) {
      return state.mini
    },
    raiz (state) {
      return state.raiz
    }
  }
})
