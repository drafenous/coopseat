; Partner Center runs the setup with /S and then looks for one Apps & features
; entry (name and publisher) under the machine uninstall key. The wizard
; still asks who to install for. Silent setup skips that page, so without
; this it would install for the current user only and the check would not
; see an entry.

!macro customInit
  !ifndef ONE_CLICK
    !ifndef INSTALL_MODE_PER_ALL_USERS
      ${If} ${Silent}
        StrCpy $hasPerMachineInstallation "1"
        StrCpy $hasPerUserInstallation "0"
        !insertmacro setInstallModePerAllUsers
      ${EndIf}
    !endif
  !endif
!macroend
