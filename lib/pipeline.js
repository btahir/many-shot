import { pipeline, env } from '@xenova/transformers'

// Skip local model check
env.allowLocalModels = false

// Use the Singleton pattern to enable lazy construction of the pipeline.
class PipelineSingleton {
  static task = 'text-generation'
  static model = 'Xenova/Qwen1.5-0.5B-Chat'
  static instance = null
  static initializing = false
  static pendingPromises = []

  static async getInstance(progress_callback = null) {
    if (this.instance) {
      return Promise.resolve(this.instance)
    }

    if (this.initializing) {
      // If model is already being initialized, return a promise that resolves when initialization is complete
      return new Promise((resolve, reject) => {
        this.pendingPromises.push({ resolve, reject })
      })
    }

    this.initializing = true

    try {
      this.instance = await pipeline(this.task, this.model, {
        progress_callback,
      })
      this.initializing = false

      // Resolve all pending promises
      this.pendingPromises.forEach(({ resolve }) => resolve(this.instance))
      this.pendingPromises = []

      return this.instance
    } catch (error) {
      this.initializing = false

      // Reject all pending promises
      this.pendingPromises.forEach(({ reject }) => reject(error))
      this.pendingPromises = []

      throw error
    }
  }
}

export default PipelineSingleton
