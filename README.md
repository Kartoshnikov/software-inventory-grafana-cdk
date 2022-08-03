# Welcome Grafana CDK

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template
 * `PROFILE=<aws cli profile> UUID=<a unique id> npm run deploy` deploy the Grafana stack through npm
 * `PROFILE=<aws cli profile> UUID=<the unique id of the mock> npm run destroy` destroy the Grafana stack through npm


## Cluster admin commands
 * `PROFILE=<aws cli profile> UUID=<a unique id> npm run deploy-cluster` deploys the cluster (admin only)
 * `PROFILE=<aws cli profile> UUID=<a unique id> npm run destroy-cluster` destroys the cluster (admin only)

## Load Dashboards
The data sources needed by the service should be stored in `lib\docker\grafana\config\dashboards\` directory using the provisioning pattern mentioned in the [grafana documentation.](https://grafana.com/docs/grafana/latest/administration/provisioning/)

*Pro Tip*:  Design the dashboard first in a instance of grafana either the docker-compose or in the cloud then export the json file.

## Load Datasources
The data sources needed by the service should be stored in `lib\docker\grafana\config\datasources\` directory using the provisioning pattern mentioned in the [grafana documentation.](https://grafana.com/docs/grafana/latest/administration/provisioning/)

## Setup
For ease, I've included a setup.sh as a central control to bundle several the forementioned commands together. 

## Local Testing
To make things as quick and easy as possible, I've included a 
`docker-compose` file so that you can run the sample dashboard example. This will stand a prometheus server and grafana dashboard up at the same time to show how the integrations work.

## Deployment to the Cloud
The `npm run deploy` command will always check if for changes in the docker file and deploy any changes into the default assets folder in the account so you can ensure that Grafana is running with the correct version and configuration at runtime.

## Notes
For Admins, we should only need to deploy the cluster once per vpc, after that the users can create stacks of mocks using the `npm run deploy` above. 

## Limitations
Due the labyrinthine that is our network routes in AWS, this stack it can only exclusively be deployed in shared services account.

The biggest limitation of this design is that it's hard coded cluster launch process  however, it wouldn't be too much of change for someone who has the time todo it!

## Author
Some say that he once bitten by a Rattle Snake... After 3 Days of suffering the rattle snake died!


## Sample Usage

### Deploying a new Grafana Stack
```
PROFILE="ss-prod" UUID="morty" npm run deploy
npm run upload
```
