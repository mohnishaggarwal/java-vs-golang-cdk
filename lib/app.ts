#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import {ServiceStack} from './service_stack';

const app = new cdk.App();

new ServiceStack(app, 'JavaService', {
    environmentVariables: [
        {name: 'SPRING_PROFILES_ACTIVE', value: 'prod'}
    ]
});