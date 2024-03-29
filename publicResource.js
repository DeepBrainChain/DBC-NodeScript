import AlipaySdk from 'alipay-sdk';

export const typeJson1 = {
  "ReportId": "u64",
  "SlashId": "u64",
  "BoxPubkey": "[u8; 32]",
  "ReportHash": "[u8; 16]",
  "URL": "Text",
  "MachineId": "Text",
  "TelecomName": "Text",
  "FoundationIssueRewards": {
    "who": "Vec<AccountId>",
    "left_reward_times": "u32",
    "first_reward_era": "EraIndex",
    "reward_interval": "EraIndex",
    "reward_amount": "Balance"
  },
  "TreasuryIssueRewards": {
    "treasury_account": "AccountId",
    "left_reward_times": "u32",
    "first_reward_era": "EraIndex",
    "reward_interval": "EraIndex",
    "reward_amount": "Balance"
  },
  "StandardGpuPointPrice": {
    "gpu_point": "u64",
    "gpu_price": "u64"
  },
  "LiveMachine": {
    "bonding_machine": "Vec<MachineId>",
    "confirmed_machine": "Vec<MachineId>",
    "booked_machine": "Vec<MachineId>",
    "online_machine": "Vec<MachineId>",
    "fulfilling_machine": "Vec<MachineId>",
    "refused_machine": "Vec<MachineId>",
    "rented_machine": "Vec<MachineId>",
    "offline_machine": "Vec<MachineId>",
    "refused_mut_hardware_machine": "Vec<MachineId>"
  },
  "StashMachine": {
    "total_machine": "Vec<MachineId>",
    "online_machine": "Vec<MachineId>",
    "total_calc_points": "u64",
    "total_gpu_num": "u64",
    "total_rented_gpu": "u64",
    "total_earned_reward": "Balance",
    "total_claimed_reward": "Balance",
    "can_claim_reward": "Balance",
    "total_rent_fee": "Balance",
    "total_burn_fee": "Balance"
  },
  "SysInfoDetail": {
    "total_gpu_num": "u64",
    "total_rented_gpu": "u64",
    "total_staker": "u64",
    "total_calc_points": "u64",
    "total_stake": "Balance",
    "total_rent_fee": "Balance",
    "total_burn_fee": "Balance"
  },
  "UserMutHardwareStakeInfo": {
    "stake_amount": "Balance",
    "offline_time": "BlockNumber"
  },
  "MachineRecentRewardInfo": {
    "machine_stash": "AccountId",
    "recent_machine_reward": "Vec<Balance>",
    "recent_reward_sum": "Balance",
    "reward_committee_deadline": "EraIndex",
    "reward_committee": "Vec<AccountId>"
  },
  "MachineInfo": {
    "controller": "AccountId",
    "machine_stash": "AccountId",
    "last_machine_renter": "Option<AccountId>",
    "last_machine_restake": "BlockNumber",
    "bonding_height": "BlockNumber",
    "online_height": "BlockNumber",
    "last_online_height": "BlockNumber",
    "init_stake_per_gpu": "Balance",
    "stake_amount": "Balance",
    "machine_status": "MachineStatus",
    "total_rented_duration": "u64",
    "total_rented_times": "u64",
    "total_rent_fee": "Balance",
    "total_burn_fee": "Balance",
    "machine_info_detail": "MachineInfoDetail",
    "reward_committee": "Vec<AccountId>",
    "reward_deadline": "EraIndex"
  },
  "MachineStatus": {
    "_enum": {
      "AddingCustomizeInfo": null,
      "DistributingOrder": null,
      "CommitteeVerifying": null,
      "CommitteeRefused": "BlockNumber",
      "WaitingFulfill": null,
      "Online": null,
      "StakerReportOffline": "(BlockNumber, Box<MachineStatus>)",
      "ReporterReportOffline": "(StashSlashReason, Box<MachineStatus>, AccountId, Vec<AccountId>)",
      "Creating": null,
      "Rented": null
    }
  },
  "StashSlashReason": {
    "_enum": {
      "RentedReportOffline": "BlockNumber",
      "OnlineReportOffline": "BlockNumber",
      "RentedInaccessible": "BlockNumber",
      "RentedHardwareMalfunction": "BlockNumber",
      "RentedHardwareCounterfeit": "BlockNumber",
      "OnlineRentFailed": "BlockNumber",
      "CommitteeRefusedOnline": null,
      "CommitteeRefusedMutHardware": null,
      "ReonlineShouldReward": null
    }
  },
  "MachineInfoDetail": {
    "committee_upload_info": "CommitteeUploadInfo",
    "staker_customize_info": "StakerCustomizeInfo"
  },
  "CommitteeUploadInfo": {
    "machine_id": "MachineId",
    "gpu_type": "Vec<u8>",
    "gpu_num": "u32",
    "cuda_core": "u32",
    "gpu_mem": "u64",
    "calc_point": "u64",
    "sys_disk": "u64",
    "data_disk": "u64",
    "cpu_type": "Vec<u8>",
    "cpu_core_num": "u32",
    "cpu_rate": "u64",
    "mem_num": "u64",
    "rand_str": "Vec<u8>",
    "is_support": "bool"
  },
  "StakerCustomizeInfo": {
    "server_room": "H256",
    "upload_net": "u64",
    "download_net": "u64",
    "longitude": "Longitude",
    "latitude": "Latitude",
    "telecom_operators": "Vec<TelecomName>"
  },
  "Longitude": {
    "_enum": {
      "East": "u64",
      "West": "u64"
    }
  },
  "Latitude": {
    "_enum": {
      "South": "u64",
      "North": "u64"
    }
  },
  "EraStashPoints": {
    "total": "u64",
    "staker_statistic": "BTreeMap<AccountId, StashMachineStatistics>"
  },
  "StashMachineStatistics": {
    "online_gpu_num": "u64",
    "inflation": "Perbill",
    "machine_total_calc_point": "u64",
    "rent_extra_grade": "u64"
  },
  "PosInfo": {
    "online_gpu": "u64",
    "offline_gpu": "u64",
    "rented_gpu": "u64",
    "online_gpu_calc_points": "u64"
  },
  "MachineGradeStatus": {
    "basic_grade": "u64",
    "is_rented": "bool"
  },
  "CommitteeList": {
    "normal": "Vec<AccountId>",
    "chill_list": "Vec<AccountId>",
    "waiting_box_pubkey": "Vec<AccountId>",
    "fulfilling_list": "Vec<AccountId>"
  },
  "OCCommitteeMachineList": {
    "booked_machine": "Vec<MachineId>",
    "hashed_machine": "Vec<MachineId>",
    "confirmed_machine": "Vec<MachineId>",
    "online_machine": "Vec<MachineId>"
  },
  "OCCommitteeOps": {
    "staked_dbc": "Balance",
    "verify_time": "Vec<BlockNumber>",
    "confirm_hash": "[u8; 16]",
    "hash_time": "BlockNumber",
    "confirm_time": "BlockNumber",
    "machine_status": "OCMachineStatus",
    "machine_info": "CommitteeUploadInfo"
  },
  "OCMachineStatus": {
    "_enum": ["Booked", "Hashed", "Confirmed"]
  },
  "OCMachineCommitteeList": {
    "book_time": "BlockNumber",
    "booked_committee": "Vec<AccountId>",
    "hashed_committee": "Vec<AccountId>",
    "confirm_start_time": "BlockNumber",
    "confirmed_committee": "Vec<AccountId>",
    "onlined_committee": "Vec<AccountId>",
    "status": "OCVerifyStatus"
  },
  "OCVerifyStatus": {
    "_enum": ["SubmittingHash", "SubmittingRaw", "Summarizing", "Finished"]
  },
  "OCPendingSlashInfo": {
    "machine_id": "MachineId",
    "machine_stash": "AccountId",
    "stash_slash_amount": "Balance",
    "inconsistent_committee": "Vec<AccountId>",
    "unruly_committee": "Vec<AccountId>",
    "reward_committee": "Vec<AccountId>",
    "committee_stake": "Balance",
    "slash_time": "BlockNumber",
    "slash_exec_time": "BlockNumber",
    "book_result": "OCBookResultType",
    "slash_result": "OCSlashResult"
  },
  "OCBookResultType": {
    "_enum": ["OnlineSucceed", "OnlineRefused", "NoConsensus"]
  },
  "OCSlashResult": {
    "_enum": ["Pending", "Canceled", "Executed"]
  },
  "OCPendingSlashReviewInfo": {
    "applicant": "AccountId",
    "staked_amount": "Balance",
    "apply_time": "BlockNumber",
    "expire_time": "BlockNumber",
    "reason": "Vec<u8>"
  },
  "ReporterReportList": {
    "processing_report": "Vec<ReportId>",
    "canceled_report": "Vec<ReportId>",
    "succeed_report": "Vec<ReportId>",
    "failed_report": "Vec<ReportId>"
  },
  "MTCommitteeOpsDetail": {
    "booked_time": "BlockNumber",
    "encrypted_err_info": "Option<Vec<u8>>",
    "encrypted_time": "BlockNumber",
    "confirm_hash": "ReportHash",
    "hash_time": "BlockNumber",
    "extra_err_info": "Vec<u8>",
    "confirm_time": "BlockNumber",
    "confirm_result": "bool",
    "staked_balance": "Balance",
    "order_status": "MTOrderStatus"
  },
  "MTOrderStatus": {
    "_enum": ["WaitingEncrypt", "Verifying", "WaitingRaw", "Finished"]
  },
  "MTCommitteeOrderList": {
    "booked_report": "Vec<ReportId>",
    "hashed_report": "Vec<ReportId>",
    "confirmed_report": "Vec<ReportId>",
    "finished_report": "Vec<ReportId>"
  },
  "MTLiveReportList": {
    "bookable_report": "Vec<ReportId>",
    "verifying_report": "Vec<ReportId>",
    "waiting_raw_report": "Vec<ReportId>",
    "finished_report": "Vec<ReportId>"
  },
  "MTReportResultInfo": {
    "report_id": "ReportId",
    "reporter": "AccountId",
    "reporter_stake": "Balance",
    "inconsistent_committee": "Vec<AccountId>",
    "unruly_committee": "Vec<AccountId>",
    "reward_committee": "Vec<AccountId>",
    "committee_stake": "Balance",
    "machine_stash": "AccountId",
    "machine_id": "MachineId",
    "slash_time": "BlockNumber",
    "slash_exec_time": "BlockNumber",
    "report_result": "ReportResultType",
    "slash_result": "SlashResult"
  },
  "ReportResultType": {
    "_enum": [
      "ReportSucceed",
      "ReportRefused",
      "ReporterNotSubmitEncryptedInfo",
      "NoConsensus"
    ]
  },
  "SlashResult": { "_enum": ["Pending", "Canceled", "Executed"] },
  "MTReportInfoDetail": {
    "reporter": "AccountId",
    "report_time": "BlockNumber",
    "reporter_stake": "Balance",
    "first_book_time": "BlockNumber",
    "machine_id": "MachineId",
    "err_info": "Vec<u8>",
    "verifying_committee": "Option<AccountId>",
    "booked_committee": "Vec<AccountId>",
    "get_encrypted_info_committee": "Vec<AccountId>",
    "hashed_committee": "Vec<AccountId>",
    "confirm_start": "BlockNumber",
    "confirmed_committee": "Vec<AccountId>",
    "support_committee": "Vec<AccountId>",
    "against_committee": "Vec<AccountId>",
    "report_status": "ReportStatus",
    "machine_fault_type": "MachineFaultType"
  },
  "MTPendingSlashReviewInfo": {
    "applicant": "AccountId",
    "staked_amount": "Balance",
    "apply_time": "BlockNumber",
    "expire_time": "BlockNumber",
    "reason": "Vec<u8>"
  },
  "ReportStatus": {
    "_enum": [
      "Reported",
      "WaitingBook",
      "Verifying",
      "SubmittingRaw",
      "CommitteeConfirmed"
    ]
  },
  "MachineFaultType": {
    "_enum": {
      "RentedInaccessible": "MachineId",
      "RentedHardwareMalfunction": "(ReportHash, BoxPubkey)",
      "RentedHardwareCounterfeit": "(ReportHash, BoxPubkey)",
      "OnlineRentFailed": "(ReportHash, BoxPubkey)"
    }
  },
  "OnlineStakeParamsInfo": {
    "online_stake_per_gpu": "Balance",
    "online_stake_usd_limit": "u64",
    "reonline_stake": "u64",
    "slash_review_stake": "Balance"
  },
  "PhaseRewardInfoDetail": {
    "online_reward_start_era": "EraIndex",
    "first_phase_duration": "EraIndex",
    "galaxy_on_era": "EraIndex",
    "phase_0_reward_per_era": "Balance",
    "phase_1_reward_per_era": "Balance",
    "phase_2_reward_per_era": "Balance"
  },
  "OPPendingSlashInfo": {
    "slash_who": "AccountId",
    "machine_id": "MachineId",
    "slash_time": "BlockNumber",
    "slash_amount": "Balance",
    "slash_exec_time": "BlockNumber",
    "reward_to_reporter": "Option<AccountId>",
    "reward_to_committee": "Option<Vec<AccountId>>",
    "slash_reason": "OPSlashReason"
  },
  "OPSlashReason": {
    "_enum": {
      "RentedReportOffline": "BlockNumber",
      "OnlineReportOffline": "BlockNumber",
      "RentedInaccessible": "BlockNumber",
      "RentedHardwareMalfunction": "BlockNumber",
      "RentedHardwareCounterfeit": "BlockNumber",
      "OnlineRentFailed": "BlockNumber",
      "CommitteeRefusedOnline": null,
      "CommitteeRefusedMutHardware": null,
      "ReonlineShouldReward": null
    }
  },
  "OPPendingSlashReviewInfo": {
    "applicant": "AccountId",
    "staked_amount": "Balance",
    "apply_time": "BlockNumber",
    "expire_time": "BlockNumber",
    "reason": "Vec<u8>"
  },
  "AllMachineIdSnapDetail": {
    "all_machine_id": "Vec<MachineId>",
    "snap_len": "u64"
  },
  "RentOrderDetail": {
    "renter": "AccountId",
    "rent_start": "BlockNumber",
    "confirm_rent": "BlockNumber",
    "rent_end": "BlockNumber",
    "stake_amount": "Balance",
    "rent_status": "RentStatus"
  },
  "RentStatus": {
    "_enum": ["WaitingVerifying", "Renting", "RentExpired"]
  },
  "CommitteeStakeParamsInfo": {
    "stake_baseline": "Balance",
    "stake_per_order": "Balance",
    "min_free_stake_percent": "Perbill"
  },
  "CommitteeStakeInfo": {
    "box_pubkey": "[u8; 32]",
    "staked_amount": "Balance",
    "used_stake": "Balance",
    "can_claim_reward": "Balance",
    "claimed_reward": "Balance"
  },
  "ReporterStakeParamsInfo": {
    "stake_baseline": "Balance",
    "stake_per_report": "Balance",
    "min_free_stake_percent": "Perbill"
  },
  "ReporterStakeInfo": {
    "staked_amount": "Balance",
    "used_stake": "Balance",
    "can_claim_reward": "Balance",
    "claimed_reward": "Balance"
  }
}


export const typeJson = {
  "ReportId": "u64",
  "SlashId": "u64",
  "BoxPubkey": "[u8; 32]",
  "ReportHash": "[u8; 16]",
  "URL": "Text",
  "MachineId": "Text",
  "TelecomName": "Text",
  "RentOrderId": "u64",
  "FoundationIssueRewards": {
    "who": "Vec<AccountId>",
    "left_reward_times": "u32",
    "first_reward_era": "EraIndex",
    "reward_interval": "EraIndex",
    "reward_amount": "Balance"
  },
  "TreasuryIssueRewards": {
    "treasury_account": "AccountId",
    "left_reward_times": "u32",
    "first_reward_era": "EraIndex",
    "reward_interval": "EraIndex",
    "reward_amount": "Balance"
  },
  "StandardGpuPointPrice": {
    "gpu_point": "u64",
    "gpu_price": "u64"
  },
  "LiveMachine": {
    "bonding_machine": "Vec<MachineId>",
    "confirmed_machine": "Vec<MachineId>",
    "booked_machine": "Vec<MachineId>",
    "online_machine": "Vec<MachineId>",
    "fulfilling_machine": "Vec<MachineId>",
    "refused_machine": "Vec<MachineId>",
    "rented_machine": "Vec<MachineId>",
    "offline_machine": "Vec<MachineId>",
    "refused_mut_hardware_machine": "Vec<MachineId>"
  },
  "StashMachine": {
    "total_machine": "Vec<MachineId>",
    "online_machine": "Vec<MachineId>",
    "total_calc_points": "u64",
    "total_gpu_num": "u64",
    "total_rented_gpu": "u64",
    "total_earned_reward": "Balance",
    "total_claimed_reward": "Balance",
    "can_claim_reward": "Balance",
    "total_rent_fee": "Balance",
    "total_burn_fee": "Balance"
  },
  "SysInfoDetail": {
    "total_gpu_num": "u64",
    "total_rented_gpu": "u64",
    "total_staker": "u64",
    "total_calc_points": "u64",
    "total_stake": "Balance",
    "total_rent_fee": "Balance",
    "total_burn_fee": "Balance"
  },
  "UserMutHardwareStakeInfo": {
    "stake_amount": "Balance",
    "offline_time": "BlockNumber"
  },
  "MachineRecentRewardInfo": {
    "machine_stash": "AccountId",
    "recent_machine_reward": "Vec<Balance>",
    "recent_reward_sum": "Balance",
    "reward_committee_deadline": "EraIndex",
    "reward_committee": "Vec<AccountId>"
  },
  "MachineInfo": {
    "controller": "AccountId",
    "machine_stash": "AccountId",
    "last_machine_renter": "Vec<AccountId>",
    "last_machine_restake": "BlockNumber",
    "bonding_height": "BlockNumber",
    "online_height": "BlockNumber",
    "last_online_height": "BlockNumber",
    "init_stake_per_gpu": "Balance",
    "stake_amount": "Balance",
    "machine_status": "MachineStatus",
    "total_rented_duration": "BlockNumber",
    "total_rented_times": "u64",
    "total_rent_fee": "Balance",
    "total_burn_fee": "Balance",
    "machine_info_detail": "MachineInfoDetail",
    "reward_committee": "Vec<AccountId>",
    "reward_deadline": "EraIndex"
  },
  "MachineStatus": {
    "_enum": {
      "AddingCustomizeInfo": null,
      "DistributingOrder": null,
      "CommitteeVerifying": null,
      "CommitteeRefused": "BlockNumber",
      "WaitingFulfill": null,
      "Online": null,
      "StakerReportOffline": "(BlockNumber, Box<MachineStatus>)",
      "ReporterReportOffline": "(StashSlashReason, Box<MachineStatus>, AccountId, Vec<AccountId>)",
      "Creating": null,
      "Rented": null
    }
  },
  "StashSlashReason": {
    "_enum": {
      "RentedReportOffline": "BlockNumber",
      "OnlineReportOffline": "BlockNumber",
      "RentedInaccessible": "BlockNumber",
      "RentedHardwareMalfunction": "BlockNumber",
      "RentedHardwareCounterfeit": "BlockNumber",
      "OnlineRentFailed": "BlockNumber",
      "CommitteeRefusedOnline": null,
      "CommitteeRefusedMutHardware": null,
      "ReonlineShouldReward": null
    }
  },
  "MachineInfoDetail": {
    "committee_upload_info": "CommitteeUploadInfo",
    "staker_customize_info": "StakerCustomizeInfo"
  },
  "CommitteeUploadInfo": {
    "machine_id": "MachineId",
    "gpu_type": "Vec<u8>",
    "gpu_num": "u32",
    "cuda_core": "u32",
    "gpu_mem": "u64",
    "calc_point": "u64",
    "sys_disk": "u64",
    "data_disk": "u64",
    "cpu_type": "Vec<u8>",
    "cpu_core_num": "u32",
    "cpu_rate": "u64",
    "mem_num": "u64",
    "rand_str": "Vec<u8>",
    "is_support": "bool"
  },
  "StakerCustomizeInfo": {
    "server_room": "H256",
    "upload_net": "u64",
    "download_net": "u64",
    "longitude": "Longitude",
    "latitude": "Latitude",
    "telecom_operators": "Vec<TelecomName>"
  },
  "Longitude": {
    "_enum": {
      "East": "u64",
      "West": "u64"
    }
  },
  "Latitude": {
    "_enum": {
      "South": "u64",
      "North": "u64"
    }
  },
  "EraStashPoints": {
    "total": "u64",
    "staker_statistic": "BTreeMap<AccountId, StashMachineStatistics>"
  },
  "StashMachineStatistics": {
    "online_gpu_num": "u64",
    "inflation": "Perbill",
    "machine_total_calc_point": "u64",
    "rent_extra_grade": "u64"
  },
  "PosInfo": {
    "online_gpu": "u64",
    "offline_gpu": "u64",
    "rented_gpu": "u64",
    "online_gpu_calc_points": "u64"
  },
  "MachineGradeStatus": {
    "basic_grade": "u64",
    "is_rented": "bool"
  },
  "CommitteeList": {
    "normal": "Vec<AccountId>",
    "chill_list": "Vec<AccountId>",
    "waiting_box_pubkey": "Vec<AccountId>",
    "fulfilling_list": "Vec<AccountId>"
  },
  "OCCommitteeMachineList": {
    "booked_machine": "Vec<MachineId>",
    "hashed_machine": "Vec<MachineId>",
    "confirmed_machine": "Vec<MachineId>",
    "online_machine": "Vec<MachineId>"
  },
  "OCCommitteeOps": {
    "staked_dbc": "Balance",
    "verify_time": "Vec<BlockNumber>",
    "confirm_hash": "[u8; 16]",
    "hash_time": "BlockNumber",
    "confirm_time": "BlockNumber",
    "machine_status": "OCMachineStatus",
    "machine_info": "CommitteeUploadInfo"
  },
  "OCMachineStatus": {
    "_enum": [
      "Booked",
      "Hashed",
      "Confirmed"
    ]
  },
  "OCMachineCommitteeList": {
    "book_time": "BlockNumber",
    "booked_committee": "Vec<AccountId>",
    "hashed_committee": "Vec<AccountId>",
    "confirm_start_time": "BlockNumber",
    "confirmed_committee": "Vec<AccountId>",
    "onlined_committee": "Vec<AccountId>",
    "status": "OCVerifyStatus"
  },
  "OCVerifyStatus": {
    "_enum": [
      "SubmittingHash",
      "SubmittingRaw",
      "Summarizing",
      "Finished"
    ]
  },
  "OCPendingSlashInfo": {
    "machine_id": "MachineId",
    "machine_stash": "AccountId",
    "stash_slash_amount": "Balance",
    "inconsistent_committee": "Vec<AccountId>",
    "unruly_committee": "Vec<AccountId>",
    "reward_committee": "Vec<AccountId>",
    "committee_stake": "Balance",
    "slash_time": "BlockNumber",
    "slash_exec_time": "BlockNumber",
    "book_result": "OCBookResultType",
    "slash_result": "OCSlashResult"
  },
  "OCBookResultType": {
    "_enum": [
      "OnlineSucceed",
      "OnlineRefused",
      "NoConsensus"
    ]
  },
  "OCSlashResult": {
    "_enum": [
      "Pending",
      "Canceled",
      "Executed"
    ]
  },
  "OCPendingSlashReviewInfo": {
    "applicant": "AccountId",
    "staked_amount": "Balance",
    "apply_time": "BlockNumber",
    "expire_time": "BlockNumber",
    "reason": "Vec<u8>"
  },
  "ReporterReportList": {
    "processing_report": "Vec<ReportId>",
    "canceled_report": "Vec<ReportId>",
    "succeed_report": "Vec<ReportId>",
    "failed_report": "Vec<ReportId>"
  },
  "MTCommitteeOpsDetail": {
    "booked_time": "BlockNumber",
    "encrypted_err_info": "Option<Vec<u8>>",
    "encrypted_time": "BlockNumber",
    "confirm_hash": "ReportHash",
    "hash_time": "BlockNumber",
    "extra_err_info": "Vec<u8>",
    "confirm_time": "BlockNumber",
    "confirm_result": "bool",
    "staked_balance": "Balance",
    "order_status": "MTOrderStatus"
  },
  "MTOrderStatus": {
    "_enum": [
      "WaitingEncrypt",
      "Verifying",
      "WaitingRaw",
      "Finished"
    ]
  },
  "MTCommitteeOrderList": {
    "booked_report": "Vec<ReportId>",
    "hashed_report": "Vec<ReportId>",
    "confirmed_report": "Vec<ReportId>",
    "finished_report": "Vec<ReportId>"
  },
  "MTLiveReportList": {
    "bookable_report": "Vec<ReportId>",
    "verifying_report": "Vec<ReportId>",
    "waiting_raw_report": "Vec<ReportId>",
    "finished_report": "Vec<ReportId>"
  },
  "MTReportResultInfo": {
    "report_id": "ReportId",
    "reporter": "AccountId",
    "reporter_stake": "Balance",
    "inconsistent_committee": "Vec<AccountId>",
    "unruly_committee": "Vec<AccountId>",
    "reward_committee": "Vec<AccountId>",
    "committee_stake": "Balance",
    "machine_stash": "AccountId",
    "machine_id": "MachineId",
    "slash_time": "BlockNumber",
    "slash_exec_time": "BlockNumber",
    "report_result": "ReportResultType",
    "slash_result": "SlashResult"
  },
  "ReportResultType": {
    "_enum": [
      "ReportSucceed",
      "ReportRefused",
      "ReporterNotSubmitEncryptedInfo",
      "NoConsensus"
    ]
  },
  "SlashResult": {
    "_enum": [
      "Pending",
      "Canceled",
      "Executed"
    ]
  },
  "MTReportInfoDetail": {
    "reporter": "AccountId",
    "report_time": "BlockNumber",
    "reporter_stake": "Balance",
    "first_book_time": "BlockNumber",
    "machine_id": "MachineId",
    "err_info": "Vec<u8>",
    "verifying_committee": "Option<AccountId>",
    "booked_committee": "Vec<AccountId>",
    "get_encrypted_info_committee": "Vec<AccountId>",
    "hashed_committee": "Vec<AccountId>",
    "confirm_start": "BlockNumber",
    "confirmed_committee": "Vec<AccountId>",
    "support_committee": "Vec<AccountId>",
    "against_committee": "Vec<AccountId>",
    "report_status": "ReportStatus",
    "machine_fault_type": "MachineFaultType"
  },
  "MTPendingSlashReviewInfo": {
    "applicant": "AccountId",
    "staked_amount": "Balance",
    "apply_time": "BlockNumber",
    "expire_time": "BlockNumber",
    "reason": "Vec<u8>"
  },
  "ReportStatus": {
    "_enum": [
      "Reported",
      "WaitingBook",
      "Verifying",
      "SubmittingRaw",
      "CommitteeConfirmed"
    ]
  },
  "MachineFaultType": {
    "_enum": {
      "RentedInaccessible": "MachineId",
      "RentedHardwareMalfunction": "(ReportHash, BoxPubkey)",
      "RentedHardwareCounterfeit": "(ReportHash, BoxPubkey)",
      "OnlineRentFailed": "(ReportHash, BoxPubkey)"
    }
  },
  "OnlineStakeParamsInfo": {
    "online_stake_per_gpu": "Balance",
    "online_stake_usd_limit": "u64",
    "reonline_stake": "u64",
    "slash_review_stake": "Balance"
  },
  "PhaseRewardInfoDetail": {
    "online_reward_start_era": "EraIndex",
    "first_phase_duration": "EraIndex",
    "galaxy_on_era": "EraIndex",
    "phase_0_reward_per_era": "Balance",
    "phase_1_reward_per_era": "Balance",
    "phase_2_reward_per_era": "Balance"
  },
  "OPPendingSlashInfo": {
    "slash_who": "AccountId",
    "machine_id": "MachineId",
    "slash_time": "BlockNumber",
    "slash_amount": "Balance",
    "slash_exec_time": "BlockNumber",
    "reporter": "Option<AccountId>",
    "renters": "Vec<AccountId>",
    "reward_to_committee": "Option<Vec<AccountId>>",
    "slash_reason": "OPSlashReason"
  },
  "OPSlashReason": {
    "_enum": {
      "RentedReportOffline": "BlockNumber",
      "OnlineReportOffline": "BlockNumber",
      "RentedInaccessible": "BlockNumber",
      "RentedHardwareMalfunction": "BlockNumber",
      "RentedHardwareCounterfeit": "BlockNumber",
      "OnlineRentFailed": "BlockNumber",
      "CommitteeRefusedOnline": null,
      "CommitteeRefusedMutHardware": null,
      "ReonlineShouldReward": null
    }
  },
  "OPPendingSlashReviewInfo": {
    "applicant": "AccountId",
    "staked_amount": "Balance",
    "apply_time": "BlockNumber",
    "expire_time": "BlockNumber",
    "reason": "Vec<u8>"
  },
  "AllMachineIdSnapDetail": {
    "all_machine_id": "Vec<MachineId>",
    "snap_len": "u64"
  },
  "RentOrderDetail": {
    "machine_id": "MachineId",
    "renter": "AccountId",
    "rent_start": "BlockNumber",
    "confirm_rent": "BlockNumber",
    "rent_end": "BlockNumber",
    "stake_amount": "Balance",
    "rent_status": "RentStatus",
    "gpu_num": "u32",
    "gpu_index": "Vec<u32>"
  },
  "RentStatus": {
    "_enum": [
      "WaitingVerifying",
      "Renting",
      "RentExpired"
    ]
  },
  "MachineGPUOrder": {
    "rent_order": "Vec<RentOrderId>",
    "used_gpu": "Vec<u32>"
  },
  "CommitteeStakeParamsInfo": {
    "stake_baseline": "Balance",
    "stake_per_order": "Balance",
    "min_free_stake_percent": "Perbill"
  },
  "CommitteeStakeInfo": {
    "box_pubkey": "[u8; 32]",
    "staked_amount": "Balance",
    "used_stake": "Balance",
    "can_claim_reward": "Balance",
    "claimed_reward": "Balance"
  },
  "ReporterStakeParamsInfo": {
    "stake_baseline": "Balance",
    "stake_per_report": "Balance",
    "min_free_stake_percent": "Perbill"
  },
  "ReporterStakeInfo": {
    "staked_amount": "Balance",
    "used_stake": "Balance",
    "can_claim_reward": "Balance",
    "claimed_reward": "Balance"
  }
}
/**
 * wssChain 调用链名称
 */
export const wssChain = {
  // dbc: 'wss://congtuinfo.dbcwallet.io:7777', // 聪图云私链测试链
  // dbc: 'wss://infotest.dbcwallet.io:7777', // 公链测试链
  // dbc: 'wss://wssrentgpu.dbcwallet.io:9001' // 单卡租用测试链
  dbc: 'wss://info.dbcwallet.io' // 公链正式链
}

/**
 * baseUrl c++ 端口
 */
// export const baseUrl = 'http://115.231.234.37:5052' // 聪图云私链端口
// export const baseUrl = 'http://192.168.1.213:5056' // 单卡租用测试端口
// export const baseUrl = 'http://119.6.235.169:5052' // 综合端口号
export const baseUrl = 'http://8.219.75.114:5002' // 综合端口号
// export const baseUrl = 'http://115.231.234.34:5052' // 主网端口

/**
 * 连接mongo数据库
 */
// export const mongoUrl = 'mongodb://localhost:27017/identifier' // 本地访问mongo
// export const mongoUrl = 'mongodb://d**:d********Y@localhost:27017/identifier' // 服务器访问mongo

/**
 * 连接mongo数据库
 */

export const mongoUrlSeed = 'ba22370884954c456be7fc10cbae7a652fbadfb64e4ab9aab4a8a944f1f8ea052abc8968bfdb05ac1dc0f0842872089e' // 本地访问mongo
// export const mongoUrlSeed = '1c5b175e2f8822cfe675341b465b129f4012f8ef53a2e25ca4b917df5c048a0a6cae31c2fb0270921b12d086c55a297cba142aa44fabf0b74359101c4edb993d' // 服务器
 

/**
 * 钱包数据
 */
 export const walletInfo = 'f16c2efe71e094d0b3dd7b319da9c6a636cc0c7740cb6e900a40220fc3b77ec8f22a99f79038f4f293e82b48c75c8c0a7c8ed484e4fc31529cce38fffe58ec67132fb793553c53f4d084c65760ea4ced1b673c1d89a0f1e8b064bda8267c456e6905cf5278751371556f0233a9542b1109adb99388dcc3aeb2ec13c1b3c216eb55acfe2d41c842d4baeb137f02424757'
//  export const walletInfo = '038b10515e072baa75d185111206ed93bd2b37b60683e95edfe0fe145034d3ad1ec23b09fd30d089c0da8af5affd19a1b04f711f8089afbfbcd1c297aaeee60600794adfb44b5c604148da45174919c658854e31c687d690cf86bc4b7e0ad6e028d7f06a8109bc5fcb8ca40b97bd1cdb7dc0b27a4f0cbb28632c93d3f7ce2ced4f0f7315ca718407c5d503e76323a0c7'
/**
 * paypal访问域名
 */
 export const paypalUrl = 'https://api-m.sandbox.paypal.com' // 沙盒测试
// export const paypalUrl = 'https://api-m.paypal.com' // 正式版本
/**
 * 定义租用机器扣除的指定钱包
 */
export const designatedWallet = '5F7L9bc3q4XdhVstJjVB2o7S8RHz2YKsHUB6k3uQpErTmVWu' // 手续费指定钱包

// 支付宝支付配置文件
export const alipaySdk = new AlipaySdk.default({
  appId: '2021003141699069',
  signType: 'RSA2',
  gateway: 'https://openapi.alipay.com/gateway.do',
  alipayPublicKey: 'your alipayPublicKey',
  privateKey: 'your privateKey',
});

/**
 * forever start -o http-out.log -e http-err.log router.js
 * forever start -o transferOutFee-out.log -e transferOutFee-err.log transferOutFee.js
 * forever start -o virtualStatus-out.log -e virtualStatus-err.log virtualStatus.js
 * forever start -o reviewReward-out.log -e reviewReward-err.log ReviewRewards.js
 * forever start -o verification-out.log -e verification-err.log VerificationMachine.js
 * forever start -o machine-out.log -e machine-err.log machineInfo.js
 * forever start -o signleVir-out.log -e signleVir-err.log signleVirStatus.js
 * forever start -o changeSG-out.log -e changeSG-err.log changeSecurity.js
 */