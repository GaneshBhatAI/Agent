$cert = New-SelfSignedCertificate -Type CodeSigningCert -Subject "CN=AIAnveshana Technologies" -CertStoreLocation Cert:\CurrentUser\My
Set-AuthenticodeSignature -Certificate $cert -FilePath dist\AIAnveshana_DeviceAgent_Setup.exe -TimestampServer "http://timestamp.digicert.com"
Get-AuthenticodeSignature dist\AIAnveshana_DeviceAgent_Setup.exe
