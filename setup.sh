#!/bin/bash
echo "This script should setup aws-cdk library, deploy wiremock and upload the mocks."
npm list aws-cdk || npm install -g aws-cdk@1.132.0
echo "What is name of your aws profile?"
read profile 
echo "What is your mock server unique id going to be? keep it within [a-z A-Z] and snappy, also less then a length of 10 ideally.."
read uuid 

if [ -z "$profile" ]; then
 echo "ERROR!!!! You did not supply a profile"
 exit 1
fi
if [ -z "$uuid" ]; then
 echo "ERROR!!!! You did not supply a uuid"
 exit 1
fi

PROFILE=$profile UUID=$uuid npm run deploy
npm run upload