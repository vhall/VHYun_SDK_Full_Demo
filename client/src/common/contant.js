
export const BUS_EVENTS = {
  get CHAT() { return VhallChat.EVENTS?.CHAT ?? 'chat' },
  get USER_JOIN() { return VhallChat.EVENTS?.JOIN ?? 'join' },
  get USER_LEFT() { return VhallChat.EVENTS?.LEFT ?? 'left' },
  get USER_MUTE() { return VhallChat.EVENTS?.MUTE ?? 'mute' },
  get USER_UNMUTE() { return VhallChat.EVENTS?.UNMUTE ?? 'unmute' },
  get ROOM_MUTE_ALL() { return VhallChat.EVENTS?.MUTE_ALL ?? 'muteAll' },
  get ROOM_UNMUTE_ALL() { return VhallChat.EVENTS?.UNMUTE_ALL ?? 'unmuteAll' },
}

export const BUS_LOCAL_EVENTS = {
  USER_LIST: 'room_user_list',
  CHAT_INIT: 'room_chat_init',
  INVA_PUBLISH_OP: 'inva_publish_op',
  INVA_FORM_OP: 'inva_form_op',
  INVA_CHAT: 'inva_chat',
  VOD_TURN_TIME: 'vod_turn_time',
  // 询问是否继续推流
  CONTINUE_PUBLISH: 'inva_continue_publish',
  SETTINGS_CHANGE: 'local_settings_change',
  RESOURCE_CHANGE: 'resource_change',
}

export const BUS_CUSTOM_EVENTS = {
  // 观众上麦申请
  REQUEST: 'vrtc_connect_apply',
  REQUEST_CALLBACK: 'vrtc_connect_agree',
  REQUEST_CALLBACK_AGREE: 'vrtc_connect_agree',
  REQUEST_CALLBACK_REJECT: 'vrtc_connect_refused',
  // 邀请上麦
  INVITER: 'vrtc_connect_invite',
  INVITER_CALLBACK_AGREE: 'vrtc_connect_invite_agree',
  INVITER_CALLBACK_REJECT: 'vrtc_connect_invite_refused',
  // 麦克风/摄像头
  CLOSE_MIC: 'vrtc_mute',
  CLOSE_MIC_ALL: 'vrtc_mute_all',
  OPEN_MIC: 'vrtc_mute_cancel',
  OPEN_MIC_ALL: 'vrtc_mute_all_cancel',
  CLOSE_CAMERA: 'vrtc_frames_forbid',
  CLOSE_CAMERA_ALL: 'vrtc_frames_forbid_all',
  OPEN_CAMERA: 'vrtc_frames_forbid_cancel',
  OPEN_CAMERA_ALL: 'vrtc_frames_forbid_cancel_all',
  // 被下麦
  DOWN: 'vrtc_disconnect_handle',
  DOWN_ALL: 'vrtc_disconnect_handle_all',
  // 房间
  KICK: 'room_kickout',
  UNKICK: 'room_kickout_cancel',
  TIP_TEXT: 'room_tip_text',
  SEND_FORM: 'questionnaire_push',
  LIVE_START: 'live_start',
  LIVE_STOP: 'live_over',
  LIVE_START_ANOTHER: 'live_broadcast_start',
  LIVE_STOP_ANOTHER: 'live_broadcast_stop',
  RESOURCE_CHANGE: 'room_resource_change',
}

export const SPECIAL_ACCOUNT_ID = {
  MASTER: '$master',
  MANGLE: '$mangle',
  EVERYONE: '$everyone',
  SYSTEM: '$system',
}
