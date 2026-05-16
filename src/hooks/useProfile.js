import { db } from '../firebase'
import {
  doc, getDoc, setDoc, updateDoc, serverTimestamp
} from 'firebase/firestore'

export const getProfile = async (userId) => {
  try {
    const ref = doc(db, 'profiles', userId)
    const snap = await getDoc(ref)
    if (snap.exists()) return snap.data()
    return null
  } catch (err) {
    console.error(err)
    return null
  }
}

export const saveProfile = async (userId, data) => {
  try {
    const ref = doc(db, 'profiles', userId)
    await setDoc(ref, {
      ...data,
      updatedAt: serverTimestamp()
    }, { merge: true })
    return true
  } catch (err) {
    console.error(err)
    return false
  }
}