# Admin Portal User Guide

## Table of Contents
- [Getting Started](#getting-started)
- [Dashboard Overview](#dashboard-overview)
- [Member Management](#member-management)
- [Onboarding Management](#onboarding-management)
- [Document Review Queue](#document-review-queue)
- [Email Management](#email-management)
- [Benefits Administration](#benefits-administration)
- [Claims Management](#claims-management)
- [Analytics and Reporting](#analytics-and-reporting)
- [System Configuration](#system-configuration)
- [Security and Compliance](#security-and-compliance)
- [Troubleshooting](#troubleshooting)

## Getting Started

### Admin Login and Access
1. **Navigate to Admin Portal**: `https://admin.yourdomain.com`
2. **Enter Credentials**: Your assigned username and password
3. **Two-Factor Authentication**: Complete 2FA if enabled
4. **Role-Based Access**: System loads based on your assigned role

### Admin Roles and Permissions

#### Super Admin
- **Full System Access**: All features and configurations
- **User Management**: Create and manage admin accounts
- **System Settings**: Configure all system parameters
- **Data Export**: Export any system data

#### Insurance Administrator
- **Member Management**: Full CRUD operations on member data
- **Benefits Management**: Configure benefit plans and coverage
- **Claims Processing**: Review and approve/reject claims
- **Document Verification**: Review uploaded member documents

#### Onboarding Specialist
- **Onboarding Monitoring**: Track member progress through 7-day journey
- **Email Management**: Configure and trigger email workflows
- **Member Support**: Assist members with onboarding issues
- **Reporting**: Generate onboarding performance reports

#### Read-Only Viewer
- **Dashboard Access**: View all system data and reports
- **No Modifications**: Cannot make changes to system data
- **Export Capabilities**: Limited to pre-defined reports

### Navigation and Interface

#### Main Navigation
- **Dashboard**: System overview and key metrics
- **Members**: Member search, creation, and management
- **Onboarding**: Monitor and manage onboarding workflows
- **Documents**: Review and verify member documents
- **Email**: Configure email templates and campaigns
- **Benefits**: Manage benefit plans and coverage
- **Claims**: Process and track insurance claims
- **Analytics**: Reports and system insights
- **Settings**: System configuration and user management

#### Quick Actions Bar
- **Add Member**: Quick member creation shortcut
- **Send Email**: Trigger immediate email communication
- **Generate Report**: Quick access to common reports
- **System Status**: View current system health

## Dashboard Overview

### Key Performance Indicators

#### Membership Metrics
- **Total Members**: Current number of active members
- **New Registrations**: Members added in selected period
- **Member Retention**: Percentage of members retained month-over-month
- **Profile Completion**: Average member profile completion percentage

#### Onboarding Metrics
- **Active Sessions**: Number of members currently in onboarding
- **Completion Rate**: Percentage completing 7-day journey
- **Average Completion Time**: Days to complete onboarding
- **Drop-off Points**: Common abandonment stages

#### Document Processing
- **Pending Documents**: Awaiting admin review
- **Processing Time**: Average document verification time
- **Approval Rate**: Percentage of documents approved
- **Backlog Status**: Documents needing attention

#### Engagement Metrics
- **Daily Active Users**: Members using platform daily
- **Feature Adoption**: Usage of specific platform features
- **Wellness Participation**: Members in wellness programs
- **Support Tickets**: Open and resolved support requests

### Real-Time Monitoring
- **System Health**: Server status, response times, error rates
- **Database Performance**: Query performance, connection pool status
- **Email Queue**: Pending and failed email deliveries
- **Background Jobs**: Status of scheduled tasks and jobs

### Recent Activity Feed
- **Member Registrations**: New member signups
- **Document Submissions**: Recently uploaded documents
- **Claims Activity**: New claims and status changes
- **System Events**: Configuration changes and important updates

## Member Management

### Member Search and Filtering
1. **Access Members**: Click "Members" in main navigation
2. **Search Options**:
   - **Name**: First name, last name, or full name
   - **Email**: Member email address
   - **Member ID**: System-assigned unique identifier
   - **Company**: Filter by employer
   - **Status**: Active, inactive, pending, suspended
   - **Registration Date**: Date range filters
3. **Advanced Filters**:
   - **Member Type**: Principal or dependent
   - **Benefits Utilization**: High, medium, or low users
   - **Onboarding Status**: Journey completion status
   - **Document Status**: Document verification status

### Creating New Members
1. **Click "Add Member"** from Members page
2. **Enter Personal Information**:
   - First and last name
   - Email address and phone number
   - Date of birth
   - Address and contact information
3. **Assign Company**: Select employer or individual
4. **Configure Benefits**:
   - Select benefit plan
   - Set coverage start date
   - Configure dependent coverage
5. **Set Onboarding Preferences**:
   - Welcome email delivery schedule
   - Communication preferences
   - Onboarding start date
6. **Review and Create**: Verify all information before submission

### Member Profile Management

#### Personal Information
- **Edit Details**: Update contact information, address, phone
- **Family Members**: Add or remove dependents
- **Employment Status**: Update job status and company changes
- **Emergency Contacts**: Maintain current emergency information

#### Benefits Configuration
- **Plan Changes**: Modify benefit elections during open enrollment
- **Coverage Levels**: Adjust individual and family coverage
- **Add-ons**: Add or remove optional benefits
- **Effective Dates**: Set when changes take effect

#### Account Status
- **Activate/Suspend**: Control member account access
- **Password Reset**: Force password change for security
- **Access Logs**: Review member login history
- **Security Settings**: Manage two-factor authentication

### Bulk Member Operations
1. **Select Multiple Members**: Use checkboxes in member list
2. **Choose Action**:
   - **Send Email**: Targeted communication
   - **Update Status**: Bulk status changes
   - **Export Data**: Download member information
   - **Assign Benefits**: Apply changes to multiple members
3. **Confirm Changes**: Review before applying bulk updates

## Onboarding Management

### Onboarding Dashboard Overview
The **Onboarding Management** dashboard provides comprehensive monitoring of member onboarding:

#### Session Statistics
- **Total Sessions**: All-time onboarding sessions
- **Active Sessions**: Members currently in progress
- **Completion Rate**: Percentage successfully completing journey
- **Average Duration**: Time to complete onboarding

#### Progress by Day
- **Day 1**: Profile completion rates
- **Day 2**: Benefits exploration engagement
- **Day 3**: Document upload completion
- **Day 4**: Provider selection completion
- **Day 5**: Wellness program setup
- **Day 6**: Preventive care scheduling
- **Day 7**: Final review completion

#### Engagement Metrics
- **Email Open Rates**: Onboarding email performance
- **Task Completion**: Specific task completion rates
- **Drop-off Analysis**: Where members abandon the process
- **Support Requests**: Help needed during onboarding

### Managing Individual Sessions
1. **Search for Member**: Use member search or onboarding list
2. **View Session Details**:
   - **Progress**: Current day and percentage complete
   - **Task Status**: Individual task completion
   - **Engagement Score**: Based on activity and interaction
   - **Last Activity**: When member last used the system
3. **Intervention Options**:
   - **Send Reminder**: Trigger targeted email
   - **Advance Day**: Move member to next onboarding day
   - **Pause Session**: Temporarily halt onboarding
   - **Reset Session**: Restart from Day 1
   - **Direct Contact**: Generate support ticket

### Email Campaign Management

#### Viewing Email Templates
1. **Access Email Management**: Click "Email" in navigation
2. **Browse Templates**: View all available email templates
3. **Preview Content**: See subject line and body content
4. **View Variables**: Understand dynamic content placeholders

#### Manual Email Triggers
1. **Select Template**: Choose appropriate email template
2. **Target Audience**:
   - **Individual Member**: Send to specific person
   - **Member Group**: Send to filtered member list
   - **All Active Members**: System-wide communication
3. **Customize Content**: Modify template variables and content
4. **Schedule Delivery**: Send immediately or schedule for later
5. **Track Performance**: Monitor open rates and engagement

### Workflow Automation

#### Automated Triggers
- **Welcome Email**: Sent immediately after member creation
- **Daily Onboarding**: Sent based on member's current day
- **Reminder Emails**: Triggered for inactive members
- **Completion Celebration**: Sent when journey is completed
- **Support Follow-up**: Sent after support interactions

#### Custom Workflows
1. **Create New Workflow**: Define trigger conditions
2. **Set Email Sequence**: Configure multi-step email campaigns
3. **Define Rules**: Specify when to send each email
4. **Test Workflow**: Validate with test member accounts
5. **Monitor Performance**: Track open rates and engagement

## Document Review Queue

### Queue Overview
The **Document Review Queue** provides centralized document management:

#### Queue Statistics
- **Total Pending**: Documents awaiting review
- **Priority Items**: Urgent documents needing attention
- **Average Review Time**: Processing time metrics
- **Today Processed**: Documents reviewed today

#### Document Categories
- **Insurance Cards**: Primary and secondary insurance
- **Government ID**: Driver's licenses, passports, etc.
- **Medical Records**: Doctor notes, test results
- **Proof of Income**: Pay stubs, tax documents
- **Other Documents**: Various required documentation

### Document Review Process

#### Reviewing Individual Documents
1. **Access Review Queue**: Click "Documents" in navigation
2. **Select Document**: Click on any pending document
3. **Review Information**:
   - **Member Details**: Name, ID, account status
   - **Document Type**: Category and requirements
   - **Upload Details**: File name, size, upload date
   - **OCR Content**: Extracted text from document
4. **Make Decision**:
   - **Approve**: Document verified and accepted
   - **Reject**: Document invalid or insufficient
   - **Request More Info**: Need additional documentation
5. **Add Notes**: Provide feedback for member
6. **Submit Review**: Process the document

#### Bulk Processing
1. **Select Multiple Documents**: Use checkboxes for bulk operations
2. **Choose Action**:
   - **Bulk Approve**: Approve selected documents
   - **Bulk Reject**: Reject selected documents
   - **Request Info**: Ask for more information
3. **Add Notes**: Common feedback for all selected
4. **Process**: Execute bulk operation

### Quality Assurance

#### Review Standards
- **Image Clarity**: Ensure documents are readable
- **Information Completeness**: Verify all required fields visible
- **Authenticity**: Check for signs of alteration
- **Expiration**: Check for expired documents
- **Relevance**: Ensure document matches category requirements

#### Audit Trail
- **Review History**: Track all document reviews and decisions
- **Reviewer Information**: Who reviewed each document
- **Timestamp**: When reviews were completed
- **Decision Reason**: Notes and rationale for decisions

## Email Management

### Template Management

#### Viewing Templates
1. **Access Email Templates**: Click "Email → Templates"
2. **Browse Categories**:
   - **Onboarding**: Welcome and journey emails
   - **Benefits**: Coverage information and updates
   - **Wellness**: Program communications
   - **System**: Maintenance and updates
3. **Preview Templates**: See how emails appear to recipients
4. **View Variables**: Understand dynamic content options

#### Creating Custom Templates
1. **Click "Create Template"**: Start template creation
2. **Configure Basic Info**:
   - **Template Name**: Internal identification
   - **Category**: Group with related templates
   - **Subject Line**: Email subject with variables
   - **Description**: Template purpose and usage
3. **Design Content**:
   - **HTML Version**: Rich content with styling
   - **Text Version**: Plain text alternative
   - **Dynamic Variables**: Personalization placeholders
   - **Responsive Design**: Mobile-friendly formatting
4. **Test Template**: Send test emails to verify appearance
5. **Save and Activate**: Make available for campaigns

### Campaign Management

#### Creating Email Campaigns
1. **Define Campaign Goals**: Purpose and success metrics
2. **Select Template**: Choose or create appropriate template
3. **Define Audience**:
   - **All Members**: System-wide communication
   - **Filtered Group**: Based on criteria (status, company, etc.)
   - **Individual Members**: Specific recipient list
4. **Customize Content**: Modify template variables and content
5. **Schedule Delivery**:
   - **Immediate Send**: Send right away
   - **Scheduled Send**: Send at specific date/time
   - **Recurring Campaign**: Automated recurring sends
6. **Monitor Performance**: Track opens, clicks, and engagement

#### Performance Analytics
- **Delivery Rates**: Successful delivery percentage
- **Open Rates**: Email open percentage
- **Click-Through Rates**: Link engagement metrics
- **Unsubscribe Rates**: Opt-out statistics
- **Conversion Tracking**: Goal completion metrics

### Automated Workflows

#### Trigger Configuration
1. **Select Trigger Type**:
   - **Member Registration**: Welcome new members
   - **Onboarding Progress**: Journey milestone communications
   - **Document Upload**: Verification status updates
   - **Benefits Changes**: Coverage notifications
   - **Wellness Milestones**: Achievement celebrations
2. **Set Conditions**: Define when trigger should fire
3. **Choose Templates**: Select email(s) to send
4. **Configure Timing**: Immediate or delayed delivery
5. **Test Workflow**: Validate with test scenarios

## Benefits Administration

### Plan Management

#### Creating Benefit Plans
1. **Access Benefits**: Click "Benefits" in navigation
2. **Create New Plan**: Configure benefit offerings
3. **Plan Details**:
   - **Plan Name**: Descriptive plan identifier
   - **Plan Type**: Medical, dental, vision, etc.
   - **Coverage Levels**: Individual, family, dependents
   - **Effective Dates**: Coverage start and end dates
4. **Coverage Configuration**:
   - **Deductibles**: Individual and family amounts
   - **Copayments**: Fixed amounts per service
   - **Coinsurance**: Percentage coverage amounts
   - **Out-of-Pocket Maximums**: Annual limits
5. **Service Coverage**:
   - **Preventive Care**: 100% covered services
   - **Primary Care**: Visit coverage and costs
   - **Specialist Care**: Referral requirements and costs
   - **Emergency Care**: Coverage and copayments
   - **Prescription Drugs**: Tier and coverage details

#### Plan Assignment
1. **Member Eligibility**: Determine who can enroll
2. **Auto-Assignment**: Set default plans for new members
3. **Open Enrollment**: Manage annual enrollment periods
4. **Special Enrollment**: Handle qualifying life events

### Coverage Management

#### Service Coverage Rules
1. **Medical Necessity**: Define coverage criteria
2. **Pre-authorization**: Requirements for specific services
3. **Referral Requirements**: Primary care physician referrals
4. **Network Restrictions**: In-network vs out-of-network coverage
5. **Exclusions**: Services not covered by plan

### Cost Analysis

#### Premium Calculation
- **Base Premiums**: Standard plan costs
- **Age Adjustments**: Age-based premium variations
- **Geographic Factors**: Location-based pricing
- **Family Size**: Dependent coverage costs
- **Wellness Discounts**: Incentive-based reductions

## Claims Management

### Claims Processing Workflow

#### Claim Submission Review
1. **Access Claims**: Click "Claims" in navigation
2. **Review New Submissions**:
   - **Member Information**: Verify claimant details
   - **Service Details**: Date of service, provider, services rendered
   - **Coverage Verification**: Check plan benefits and eligibility
   - **Documentation**: Review supporting documents
3. **Validation Checks**:
   - **Eligibility**: Member coverage active date
   - **Authorization**: Required pre-approvals obtained
   - **Network Status**: Provider in-network verification
   - **Medical Necessity**: Service appropriateness

#### Claim Adjudication
1. **Coverage Determination**: Apply plan rules and benefits
2. **Calculate Payment**: Provider reimbursement amounts
3. **Member Responsibility**: Determine copayments, deductibles
4. **Generate Explanation of Benefits**: Create EOB for member
5. **Process Payment**: Initiate provider payments

### Claims Analytics

#### Processing Metrics
- **Volume**: Number of claims processed per period
- **Turnaround Time**: Average processing duration
- **Accuracy Rate**: Correct processing percentage
- **Cost per Claim**: Processing cost metrics

#### Trend Analysis
- **Service Utilization**: Most claimed services
- **Provider Patterns**: Frequently used providers
- **Cost Trends**: Claim cost changes over time
- **Denial Reasons**: Common rejection causes

## Analytics and Reporting

### Standard Reports

#### Membership Reports
- **Enrollment Summary**: Current membership statistics
- **Growth Trends**: New member acquisition over time
- **Retention Analysis**: Member renewal and cancellation rates
- **Demographic Breakdown**: Member age, location, employment data

#### Financial Reports
- **Premium Revenue**: Income from member premiums
- **Claims Cost**: Total claim payments and trends
- **Loss Ratio**: Claims cost vs premium revenue
- **Administrative Costs**: Operating expense analysis

#### Utilization Reports
- **Service Usage**: Healthcare service utilization patterns
- **Provider Networks**: Most utilized providers and facilities
- **Benefit Utilization**: Specific benefit usage rates
- **Geographic Patterns**: Regional utilization differences

### Custom Reports

#### Report Builder
1. **Select Data Source**: Choose database tables and fields
2. **Apply Filters**: Define report criteria and parameters
3. **Configure Grouping**: Organize data by categories
4. **Add Calculations**: Create custom metrics and formulas
5. **Design Layout**: Format report appearance and charts
6. **Schedule Generation**: Automated report creation and delivery

#### Export Options
- **PDF**: Formatted reports for sharing
- **Excel**: Raw data for analysis
- **CSV**: Data import into other systems
- **API Access**: Real-time data integration

## System Configuration

### User Management

#### Admin Account Management
1. **Create New Admin**: Click "Settings → Users → Add User"
2. **Configure Account**:
   - **User Information**: Name, email, contact details
   - **Role Assignment**: Appropriate system role
   - **Permissions**: Specific feature access
   - **Security Settings**: 2FA requirements
3. **Set Access Limits**:
   - **Data Restrictions**: Limit access to specific companies
   - **Feature Access**: Enable/disable specific features
   - **Time Restrictions**: Limit access to business hours

#### Role Configuration
1. **Define Roles**: Create custom roles with specific permissions
2. **Assign Permissions**: Grant access to required features
3. **Configure Access**: Set data and feature restrictions
4. **Review Regularly**: Update roles as needs change

### System Settings

#### Email Configuration
1. **SMTP Settings**: Configure email server connection
2. **Template Defaults**: Set default sender information
3. **Delivery Options**: Configure email delivery preferences
4. **Bounce Handling**: Manage failed email deliveries

#### File Storage
1. **Storage Type**: Local, cloud, or hybrid storage
2. **Security Settings**: Encryption and access controls
3. **Retention Policies**: Automated file cleanup rules
4. **Backup Configuration**: Data backup and recovery

#### Security Configuration
1. **Password Policies**: Complexity and expiration rules
2. **Session Settings**: Timeout and security options
3. **API Access**: Rate limiting and authentication
4. **Audit Logging**: Track system access and changes

## Security and Compliance

### Data Security

#### Access Control
- **Role-Based Access**: Users only access required data
- **Multi-Factor Authentication**: Additional security layer
- **Session Management**: Secure session handling
- **API Security**: Protected endpoint access

#### Data Protection
- **Encryption**: Data at rest and in transit
- **Audit Logging**: Complete access tracking
- **Data Backup**: Regular secure backups
- **Privacy Controls**: Member data protection

### Compliance Management

#### HIPAA Compliance
- **Protected Health Information**: Secure PHI handling
- **Business Associate Agreements: Required legal agreements
- **Risk Assessments**: Regular security evaluations
- **Training**: Staff compliance education

#### Regulatory Requirements
- **Data Retention**: Required data storage periods
- **Reporting Standards**: Regulatory reporting formats
- **Privacy Policies**: Member privacy protection
- **Audit Requirements**: Regular compliance audits

## Troubleshooting

### Common Issues

#### Member Problems
- **Login Issues**: Password resets, account locks
- **Document Uploads**: File format, size, and processing
- **Benefit Confusion**: Coverage explanation and clarification
- **Claim Delays**: Processing status and requirements

#### System Issues
- **Performance**: Slow loading and response times
- **Email Delivery**: Failed notifications and bounces
- **Data Sync**: Database synchronization problems
- **Integration**: Third-party service connections

#### Technical Support
1. **Error Messages**: Document specific error codes and messages
2. **System Logs**: Review application and server logs
3. **Performance Monitoring**: Check system resource usage
4. **User Reports**: Gather detailed user feedback

### Support Procedures

#### Issue Escalation
1. **Level 1**: Basic troubleshooting and user guidance
2. **Level 2**: Technical investigation and resolution
3. **Level 3**: System architecture and advanced issues
4. **Vendor Support**: Third-party service problems

#### Documentation
- **Knowledge Base**: Solutions to common problems
- **Runbooks**: Step-by-step resolution procedures
- **Incident Reports**: Problem documentation and follow-up
- **Change Management**: System update procedures

---

## Best Practices for Admins

1. **Regular Monitoring**: Check dashboard metrics daily
2. **Proactive Outreach**: Contact members with potential issues
3. **Documentation**: Maintain detailed notes on member interactions
4. **Security**: Follow all security protocols and best practices
5. **Training**: Stay current on system features and healthcare regulations
6. **Communication**: Keep members informed about system changes and issues
7. **Quality Assurance**: Double-check work before submission
8. **Continuous Improvement**: Suggest system enhancements based on user feedback

The admin portal is designed to be intuitive and powerful, enabling efficient management of member engagement and healthcare benefits. Regular use and exploration of features will help maximize the system's effectiveness.