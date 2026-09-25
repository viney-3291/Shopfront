variable "alert_email" {
  description = "Email address to receive CloudWatch alarm notifications"
  type        = string
  default     = "vinay.dops77@gmail.com"
}

resource "aws_sns_topic" "alerts" {
  name = "${var.cluster_name}-alerts"
}

resource "aws_sns_topic_subscription" "email" {
  count     = var.alert_email != "" ? 1 : 0
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

resource "aws_cloudwatch_metric_alarm" "node_memory_high" {
  alarm_name          = "${var.cluster_name}-node-memory-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods   = 3
  metric_name         = "node_memory_utilization"
  namespace           = "ContainerInsights"
  period              = 60
  statistic           = "Average"
  threshold           = 85
  alarm_description   = "A node's memory usage has been above 85% for 3 minutes"
  dimensions = {
    ClusterName = var.cluster_name
  }
  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]
}

resource "aws_cloudwatch_metric_alarm" "pod_restarts_high" {
  alarm_name          = "${var.cluster_name}-pod-restarts-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods   = 1
  metric_name         = "pod_number_of_container_restarts"
  namespace           = "ContainerInsights"
  period              = 180
  statistic           = "Sum"
  threshold           = 3
  alarm_description   = "A pod has restarted more than 3 times in 3 minutes — likely crash-looping"
  dimensions = {
    ClusterName = var.cluster_name
  }
  alarm_actions = [aws_sns_topic.alerts.arn]
}