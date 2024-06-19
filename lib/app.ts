#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import {ServiceStack} from './service_stack';
import {Environment} from "aws-cdk-lib";

const app = new cdk.App();
const defaultEnv: Environment = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION
}

new ServiceStack(app, 'JavaService', {
  env: defaultEnv
});