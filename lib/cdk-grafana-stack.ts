import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { ExampleStack, Account, Environment, ExampleStackProps, Networking, ExampleSubnetType } from '@example/example-cdk-lib';

export interface Props extends ExampleStackProps {
  account: Account;
  environment: Environment;
  serviceName: string;
  uuid: string;
}

export class CdkGrafanaStack extends ExampleStack {
  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id, props);
    const grafana_port = 3000
    const domain = 'example.com';
    const siteDns = props.uuid +"-grafana"+"." + domain;
    const vpcId = Networking.getVpcId(props.account.id, props.environment)
    const vpc = ec2.Vpc.fromVpcAttributes(this, 'Vpc', {
      vpcId: vpcId,
      availabilityZones: ['us-east-1a', 'us-east-1b', 'us-east-1c'],
      privateSubnetIds: Networking.getSubnetIds(vpcId, ExampleSubnetType.private),
      publicSubnetIds: Networking.getSubnetIds(vpcId, ExampleSubnetType.public)
    });

    const clusterArn = cdk.Fn.importValue("grafana-cluster-" + props.environment + "-arn");
    const clusterName = cdk.Fn.importValue("grafana-cluster-" + props.environment + "-name");
    const cluster = ecs.Cluster.fromClusterAttributes(this, "clusterRef", { clusterArn: clusterArn, securityGroups: [], clusterName: clusterName, vpc: vpc })

    const taskExecutionRole = iam.Role.fromRoleArn(this,"get-role","arn:aws:iam::111111111111:role/grafana-role", {mutable: true})

    const grafanaSecurityGroup = new ec2.SecurityGroup(this, props.serviceName + props.uuid, {
      vpc: vpc
    });

    const allow_traffic_to_grafana = new ec2.SecurityGroup(this, "grafana-" + props.uuid, {
      vpc
    });

    allow_traffic_to_grafana.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(3000), "  allow all VPC traffic onto container on port 8080");
    grafanaSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), "adding any IPV4 onto the LB since the the LB is internal");

    const taskDef = new ecs.FargateTaskDefinition(this, "fargateTaskDek-" + props.uuid, {
      memoryLimitMiB: 2048,
      cpu: 1024,
      executionRole: taskExecutionRole,
      taskRole: taskExecutionRole
    });

    const logGroup = new ecs.AwsLogDriver({ streamPrefix: "grafana-" + props.uuid, logRetention: logs.RetentionDays.ONE_DAY })
    const grafanaImage = new ecs.AssetImage("./lib/docker/grafana");
    const containerId = "grafana-" + props.uuid;
    
    const username_ses   = cdk.SecretValue.secretsManager("arn:aws:secretsmanager:us-east-1:111111111111:secret:grafana/ses2-eeeeee",{jsonField: "USERNAME"})
    const password_ses   = cdk.SecretValue.secretsManager("arn:aws:secretsmanager:us-east-1:111111111111:secret:grafana/ses2-eeeeee",{jsonField: "PASSWORD"})
    
    const git_id         = cdk.SecretValue.secretsManager("arn:aws:secretsmanager:us-east-1:111111111111:secret:grafana/gitlab-software-inventory-qqqqqq",{jsonField: "ID"})
    const git_secret     = cdk.SecretValue.secretsManager("arn:aws:secretsmanager:us-east-1:111111111111:secret:grafana/gitlab-software-inventory-qqqqqq",{jsonField: "SECRET"})
    
    const container = taskDef.addContainer(containerId, {
      image: grafanaImage,
      logging: logGroup,
      environment: {
        GF_SERVER_DOMAIN: siteDns,
        GF_SERVER_ROOT_URL: 'https://' + siteDns,
        GF_SMTP_ENABLED: 'true',
        GF_SMTP_HOST: 'email-smtp.us-east-1.amazonaws.com',
        GF_AUTH_GITLAB_ENABLED: 'true',
        GF_AUTH_GITLAB_ALLOW_SIGN_UP: 'true',
        GF_AUTH_GITLAB_CLIENT_SCOPES: 'read_api',
        GF_AUTH_GITLAB_AUTH_URL: 'https://git.example.com/oauth/authorize',
        GF_AUTH_GITLAB_TOKEN_URL: 'https://git.example.com/oauth/token',
        GF_AUTH_GITLAB_API_URL: 'https://git.example.com/api/v4',
        GF_AUTH_GITLAB_CLIENT_ID: git_id.unsafeUnwrap(),
        GF_AUTH_GITLAB_CLIENT_SECRET:git_secret.unsafeUnwrap(), 
        GF_SMTP_USERNAME:username_ses.unsafeUnwrap(),
        GF_SMTP_PASSWORD:password_ses.unsafeUnwrap()
      },
      linuxParameters: new ecs.LinuxParameters(this, 'linuxParameters', {
        initProcessEnabled: true
      })
    });

    container.addPortMappings({
      containerPort: grafana_port
    });

    const service = new ecs.FargateService(this, "grafana-service-" + props.serviceName + "-" + props.uuid, {
      cluster: cluster,
      serviceName: containerId,
      taskDefinition: taskDef,
      propagateTags: ecs.PropagatedTagSource.TASK_DEFINITION,
      desiredCount: 1,
      securityGroups: [allow_traffic_to_grafana]
    });

    const subnetSelection = vpc.selectSubnets({ subnetType: ec2.SubnetType.PRIVATE_WITH_NAT })
    const lb = new elbv2.ApplicationLoadBalancer(this, 'LB-' + props.uuid, {
      vpc: vpc,
      internetFacing: false,
      vpcSubnets: subnetSelection,
      securityGroup: grafanaSecurityGroup
    });

    //NOTE:: this is proper lazy... it locks this code into one account however since this also manipulates a cname record then it's stuck in shared services anyways.
    const cert = acm.Certificate.fromCertificateArn(this, "loadCert", "arn:aws:acm:us-east-1:111111111111:certificate/23g4kjh5-12l3-12lk-3453-34kj5lh6jlk3");

    const listener = lb.addListener('listenerForService' + props.environment + props.uuid, { port: 443, open: false, certificates: [cert] });
    listener.connections.addSecurityGroup(grafanaSecurityGroup);

    // Attach ALB to ECS Service
    listener.addTargets('ECS_lt_' + props.environment + "_" + props.uuid, {
      port: grafana_port,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [service.loadBalancerTarget({
        containerName: containerId,
        containerPort: grafana_port,
        protocol: ecs.Protocol.TCP,
      })],
      // include health check (default is none)
      healthCheck: {
        healthyHttpCodes: "200",
        interval: cdk.Duration.seconds(60),
        path: "/login",
        protocol: elbv2.Protocol.HTTP,
        port: grafana_port.toString(),
        timeout: cdk.Duration.seconds(5),
      }
    });

    const hostedZone = route53.PrivateHostedZone.fromLookup(this, "pZoneId", { domainName: domain, privateZone: true });
    const cname = new route53.CnameRecord(this, "cname_record", { zone: hostedZone, recordName: siteDns, domainName: lb.loadBalancerDnsName });
    new cdk.CfnOutput(this, 'grafana-' + props.environment + "-" + props.uuid + '-dns', { value: cname.domainName });
    new cdk.CfnOutput(this, 'grafana-' + props.environment + "-" + props.uuid + '-serviceLoadBalancer', { value: lb.loadBalancerDnsName });
  }
}
