#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CdkGrafanaStack } from '../lib/cdk-grafana-stack';
import { Environment, Account } from '@example/example-cdk-lib';

const app = new cdk.App();
const account = {account: process.env.CDK_DEFAULT_ACCOUNT, region: "us-east-1"}
const uuid = app.node.tryGetContext('uuid');
new CdkGrafanaStack(app, 'CdkGrafanaStack-Dev-'+uuid, {
  serviceName: "grafana",
  uuid: uuid,
  environment: Environment.prod,
  account: Account.example_SHARED_SERVICES_PROD,
  tags: {
    Owner: "admin@example.com",
    Name: "grafana",
    ProductName: "grafana",
    CostCentre: "FIL",
    
  },
  env: account 
});
