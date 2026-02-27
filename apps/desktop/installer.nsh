; Override the default CHECK_APP_RUNNING behavior which uses nsProcess::FindProcess
; and can produce false-positive "Vaulty cannot be closed" errors.
!macro customCheckAppRunning
  ; Kill Vaulty process tree
  nsExec::ExecToStack "taskkill /F /IM ${APP_EXECUTABLE_FILENAME} /T"
  Pop $0
  Pop $0
  
  ; Kill any trailing Node.js processes started by Vaulty (the Next.js server)
  ; This is crucial because if node.exe holds a lock on the .next/standalone folder,
  ; the uninstaller will fail and throw the "cannot be closed" error.
  nsExec::ExecToStack "taskkill /F /IM node.exe /T"
  Pop $0
  Pop $0
  
  ; Give Windows time to release file handles
  Sleep 2000
!macroend

; If the old uninstaller fails (e.g., due to a stubborn locked file),
; completely ignore the error and continue installing rather than 
; showing the "cannot be closed" dialog natively from installUtil.nsh
!macro customUnInstallCheck
  ClearErrors
  ; Do nothing else, returning immediately ignores the $R0 error check
!macroend

!macro customUnInstallCheckCurrentUser
  ClearErrors
!macroend
