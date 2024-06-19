import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {Repository} from 'aws-cdk-lib/aws-ecr';

export class ServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new Repository(this, 'central-repo', {
      repositoryName: 'central-repo'
    })
  }
}
