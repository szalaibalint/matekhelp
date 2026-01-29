import { supabase } from '../../supabase/supabase';

export interface DevelopmentModeSettings {
  enabled: boolean;
  message: string;
}

export interface SiteInfo {
  name: string;
  version: string;
}

export interface SiteSetting {
  id: string;
  setting_key: string;
  setting_value: any;
  description?: string;
  created_at: string;
  updated_at: string;
  updated_by?: string;
}

/**
 * Service for managing site-wide settings
 */
export class SiteSettingsService {
  /**
   * Get a specific setting by key
   */
  static async getSetting(key: string): Promise<SiteSetting | null> {
    const { data, error } = await supabase
      .from('site_settings')
      .select('*')
      .eq('setting_key', key)
      .single();

    if (error) {
      console.error(`Error fetching setting ${key}:`, error);
      return null;
    }

    return data;
  }

  /**
   * Get all settings
   */
  static async getAllSettings(): Promise<SiteSetting[]> {
    const { data, error } = await supabase
      .from('site_settings')
      .select('*')
      .order('setting_key');

    if (error) {
      console.error('Error fetching all settings:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Update a specific setting
   */
  static async updateSetting(key: string, value: any, userId?: string): Promise<boolean> {
    const updateData: any = {
      setting_value: value,
      updated_at: new Date().toISOString()
    };

    if (userId) {
      updateData.updated_by = userId;
    }

    const { error } = await supabase
      .from('site_settings')
      .update(updateData)
      .eq('setting_key', key);

    if (error) {
      console.error(`Error updating setting ${key}:`, error);
      return false;
    }

    return true;
  }

  /**
   * Get development mode settings
   */
  static async getDevelopmentMode(): Promise<DevelopmentModeSettings> {
    const setting = await this.getSetting('development_mode');
    
    if (!setting) {
      return {
        enabled: false,
        message: 'A weboldal jelenleg fejlesztés alatt áll. Kérjük, nézzen vissza később!'
      };
    }

    return setting.setting_value as DevelopmentModeSettings;
  }

  /**
   * Update development mode settings
   */
  static async updateDevelopmentMode(
    enabled: boolean, 
    message: string, 
    userId?: string
  ): Promise<boolean> {
    return this.updateSetting('development_mode', { enabled, message }, userId);
  }

  /**
   * Get site info
   */
  static async getSiteInfo(): Promise<SiteInfo> {
    const setting = await this.getSetting('site_info');
    
    if (!setting) {
      return {
        name: 'MatekHelp',
        version: '1.0.0'
      };
    }

    return setting.setting_value as SiteInfo;
  }

  /**
   * Check if site is in development mode
   */
  static async isInDevelopmentMode(): Promise<boolean> {
    const devMode = await this.getDevelopmentMode();
    return devMode.enabled;
  }
}
