// Utility functions for managing Firestore connection issues
import authService from '../services/authService';
import { terminateFirestore, reinitializeFirestore, isFirestoreActive } from '../services/firebaseConfig';

export class FirestoreManager {
  private static errorCount = 0;
  private static maxErrors = __DEV__ ? 3 : 5; // Terminate faster in development
  private static isMonitoring = false;
  private static isTerminated = false;

  // Start monitoring for Firestore connection errors
  static startErrorMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log('Started Firestore error monitoring');
    
    // Listen for console warnings about Firestore
    const originalWarn = console.warn;
    console.warn = (...args: any[]) => {
      const message = args.join(' ');
      
      if (message.includes('Firestore') && message.includes('transport errored')) {
        this.errorCount++;
        
        if (__DEV__ && this.errorCount <= 3) {
          console.log(`Firestore error count: ${this.errorCount}/${this.maxErrors}`);
          if (this.errorCount === 1) {
            console.log('🔧 Development mode: Switching to offline mode for faster loading');
          }
        }
        
        if (this.errorCount >= this.maxErrors && !this.isTerminated) {
          this.terminateFirestoreCompletely();
        }
      }
      
      originalWarn.apply(console, args);
    };
  }

  // Completely terminate Firestore to stop all connection attempts
  private static async terminateFirestoreCompletely(): Promise<void> {
    console.log('Terminating Firestore completely due to persistent connection errors');
    
    // Disable in auth service
    authService.disableFirestore();
    
    // Terminate actual Firestore connections
    await terminateFirestore();
    this.isTerminated = true;
    
    console.log('Firestore completely terminated - no more connection attempts');
    
    // Re-enable after 5 minutes
    setTimeout(async () => {
      console.log('Re-initializing Firestore after timeout');
      await this.enableFirestoreCompletely();
    }, 5 * 60 * 1000); // 5 minutes
  }

  // Completely re-enable Firestore
  private static async enableFirestoreCompletely(): Promise<void> {
    if (this.isTerminated) {
      reinitializeFirestore();
      authService.enableFirestore();
      this.isTerminated = false;
      this.errorCount = 0;
      console.log('Firestore completely re-enabled');
    }
  }

  // Manually disable Firestore (for troubleshooting)
  static async disableFirestore(): Promise<void> {
    authService.disableFirestore();
    await terminateFirestore();
    this.isTerminated = true;
    console.log('Firestore manually disabled and terminated - using local storage only');
  }

  // Manually enable Firestore
  static enableFirestore(): void {
    if (this.isTerminated) {
      reinitializeFirestore();
      this.isTerminated = false;
    }
    authService.enableFirestore();
    this.errorCount = 0;
    console.log('Firestore manually enabled');
  }

  // Reset error count
  static resetErrorCount(): void {
    this.errorCount = 0;
    console.log('Firestore error count reset');
  }

  // Get current error count
  static getErrorCount(): number {
    return this.errorCount;
  }

  // Check if Firestore is completely terminated
  static isFirestoreTerminated(): boolean {
    return this.isTerminated;
  }
}

// Auto-start monitoring when this module is imported
FirestoreManager.startErrorMonitoring();
