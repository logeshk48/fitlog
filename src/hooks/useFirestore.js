import { db } from '../firebase'
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore'

// ================================
// SAVE WORKOUT
// ================================
export const saveWorkout = async (userId, workoutData) => {
  try {
    const docRef = await addDoc(collection(db, 'workouts'), {
      userId,
      ...workoutData,
      createdAt: serverTimestamp()
    })
    return { success: true, id: docRef.id }
  } catch (error) {
    console.error('Error saving workout:', error)
    return { success: false, error }
  }
}

// ================================
// GET ALL WORKOUTS FOR USER
// ================================
export const getWorkouts = async (userId) => {
  try {
    const q = query(
      collection(db, 'workouts'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error getting workouts:', error)
    return []
  }
}

// ================================
// GET RECENT WORKOUTS
// ================================
export const getRecentWorkouts = async (userId, limitCount = 7) => {
  try {
    const q = query(
      collection(db, 'workouts'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.slice(0, limitCount).map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error getting recent workouts:', error)
    return []
  }
}

// ================================
// DELETE WORKOUT
// ================================
export const deleteWorkout = async (workoutId) => {
  try {
    await deleteDoc(doc(db, 'workouts', workoutId))
    return { success: true }
  } catch (error) {
    console.error('Error deleting workout:', error)
    return { success: false, error }
  }
}