#!/bin/bash
# This script will try to import the Terraform State from the Twilio Function assets.
set -e
echo "Trying to import Terraform State for $ENVIRONMENT"
echo "### Job Results "

source ./config.sh

echo "terraform state service name: $tfstate_service_name" >>$GITHUB_STEP_SUMMARY

IFS="|" read -ra tf_state_files <<<"$TF_STATE_FILES"

tfstate_bucket_url=$(npx twilio api:serverless:v1:services:environments:list --service-sid $tfstate_service_name -o json | jq -c '.[].domainName // empty' | sed 's/"//g')

if [ -n "$tfstate_bucket_url" ]; then
	echo "Bucket domain is: $tfstate_bucket_url"
	full_link="https://$tfstate_bucket_url/verify-function"
	echo "Full URL is: $full_link"
	response=$(curl -s -o /dev/null -w "%{http_code}" $full_link)

	if [ "$response" -eq 401 ]; then
		for item in "${tf_state_files[@]}"; do
			full_item_name="$item.tar.gz"
			curl --location "$full_link" \
				-o $full_item_name \
				--header 'Content-Type: application/json' \
				--data '{
							"apiKey": "'"$TWILIO_API_KEY"'",
							"apiSecret": "'"$TWILIO_API_SECRET"'",
							"assetKey": "'"$full_item_name"'"
			}'
			tar -xzvf "$full_item_name"
			set +e
			openssl enc -d -in "$item.enc" -aes-256-cbc -pbkdf2 -k "$ENCRYPTION_KEY$tfstate_version" -out "../terraform/environments/default/$item"
			openssl_result=$?
			set -e
			if [[ "$openssl_result" != 0 ]]; then
				echo "   - :x: Unable to decrypt existing terraform state file $item. If you just updated from the upstream template, this may be intentional!" >>$GITHUB_STEP_SUMMARY
				rm -f "../terraform/environments/default/$item"
			else
				echo "$openssl_output   - :white_check_mark: Existing terraform state file $item retrieved" >>$GITHUB_STEP_SUMMARY
			fi
			rm -f "$full_item_name"
			rm -f "$item.enc"
		done
	else
		echo "JOB_FAILED=true" >>"$GITHUB_OUTPUT"
		echo "$full_link not found" >>"$GITHUB_STEP_SUMMARY"
		echo "   - :x: Existing Terrform state identified - but unable to retrieve it - if this is in error try removing the tfstate service on your twilio account" >>$GITHUB_STEP_SUMMARY
		exit 1
	fi
else
	echo "   - :white_check_mark: Unable to identify an existing terraform state - proceeding without" >>$GITHUB_STEP_SUMMARY
fi
echo "JOB_FAILED=false" >>"$GITHUB_OUTPUT"

