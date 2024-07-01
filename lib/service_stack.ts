import {Duration, Stack, StackProps} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {Vpc} from "aws-cdk-lib/aws-ec2";
import {AwsLogDriver, Cluster, Compatibility, ContainerImage, TaskDefinition} from "aws-cdk-lib/aws-ecs";
import {Repository} from "aws-cdk-lib/aws-ecr";
import {ApplicationLoadBalancedFargateService} from "aws-cdk-lib/aws-ecs-patterns";
import {ManagedPolicy, Role, ServicePrincipal} from "aws-cdk-lib/aws-iam";
import {AttributeType, Table} from "aws-cdk-lib/aws-dynamodb";

const CPU_UTILIZATION = '256';
const MEMORY_UTILIZATION = '512';
const IMAGE_TAG = 'latest';

export interface EnvironmentVariable {
  name: string,
  value: string
}

export interface ServiceStackProps extends StackProps {
  environmentVariables: EnvironmentVariable[];
}

export class ServiceStack extends Stack {
  constructor(scope: Construct, id: string, props: ServiceStackProps) {
    super(scope, id, props);

    const repoName = `${id.toLowerCase()}_repo`;
    new Repository(this, `${id.toLowerCase()}_repo`, {
      repositoryName: repoName
    });

    const vpc = new Vpc(this, `${id}-vpc`, {
      maxAzs: 3
    });

    const taskRole = new Role(this, `${id}-task-role`, {
      assumedBy: new ServicePrincipal("ecs-tasks.amazonaws.com"),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName(
            "service-role/AmazonECSTaskExecutionRolePolicy"
        ),
      ]
    })

    const cluster = new Cluster(this, `${id}-ecs-cluster`, {
      vpc: vpc,
      containerInsights: true
    });

    const taskDefinition = new TaskDefinition(this, `${id}-task-defintion`, {
      cpu: CPU_UTILIZATION,
      memoryMiB: MEMORY_UTILIZATION,
      compatibility: Compatibility.FARGATE,
      taskRole
    });

    const container = taskDefinition.addContainer(`${id}-application-container`, {
      image: ContainerImage.fromEcrRepository(
          Repository.fromRepositoryName(this, `${id}-IRepo`, repoName),
          IMAGE_TAG
      ),
      logging: new AwsLogDriver({
        streamPrefix: `${id}-application-logs`
      })
    });

    props.environmentVariables.forEach(envVar => {
      container.addEnvironment(envVar.name, envVar.value);
    });

    container.addPortMappings({
      containerPort: 8080
    });

    const applicationLoadBalancedService = new ApplicationLoadBalancedFargateService(this, `${id}-application-service`, {
      cluster,
      taskDefinition,
      publicLoadBalancer: true
    });

    /**
     * Even with a health check grace period of 60 seconds, deployments were constantly failing. I think the reason
     * being a health check grace period will stop the ECS service from killing the task on startup if the target group
     * reports a task is unhealthy, but it won't get the target group to perform more health checks after determining
     * the task is unhealthy. This allows new deployments to have time before being deemed unhealthy.
     */
    applicationLoadBalancedService.targetGroup.configureHealthCheck({
      timeout: Duration.seconds(10),
      healthyThresholdCount: 3,
      unhealthyThresholdCount: 10,
      interval: Duration.seconds(60)
    })

    const dynamoDbTable = new Table(this, `${id}-dynamo-table`, {
      tableName: `${id.toLowerCase()}_products_table`,
      partitionKey: {name: 'Id', type: AttributeType.STRING}
    })
    dynamoDbTable.grantReadWriteData(taskRole);
  }
}
