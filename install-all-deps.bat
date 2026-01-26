@echo off
echo Installing dependencies for all services...

cd /d "c:\Users\user\Desktop\MedicalCoverageSystem\services\crm-service"
echo Installing crm-service dependencies...
call npm install

cd /d "c:\Users\user\Desktop\MedicalCoverageSystem\services\finance-service"
echo Installing finance-service dependencies...
call npm install

cd /d "c:\Users\user\Desktop\MedicalCoverageSystem\services\wellness-service"
echo Installing wellness-service dependencies...
call npm install

cd /d "c:\Users\user\Desktop\MedicalCoverageSystem\services\membership-service"
echo Installing membership-service dependencies...
call npm install

cd /d "c:\Users\user\Desktop\MedicalCoverageSystem\services\hospital-service"
echo Installing hospital-service dependencies...
call npm install

cd /d "c:\Users\user\Desktop\MedicalCoverageSystem\services\insurance-service"
echo Installing insurance-service dependencies...
call npm install

cd /d "c:\Users\user\Desktop\MedicalCoverageSystem\services\core-service"
echo Installing core-service dependencies...
call npm install

cd /d "c:\Users\user\Desktop\MedicalCoverageSystem\services\billing-service"
echo Installing billing-service dependencies...
call npm install

cd /d "c:\Users\user\Desktop\MedicalCoverageSystem\services\api-gateway"
echo Installing api-gateway dependencies...
call npm install

echo All dependencies installed successfully!