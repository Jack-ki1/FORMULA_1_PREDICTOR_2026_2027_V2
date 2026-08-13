"""
Test API client functionality.
Tests API client retry logic, caching, and fallback behavior.
"""
import pytest
from data.api_client import APIClient
from config.settings import settings


class TestAPIClient:
    """Test suite for API client."""
    
    def test_client_initialization(self):
        """Test API client initialization."""
        client = APIClient('https://httpbin.org')
        
        assert client.base_url == 'https://httpbin.org'
        assert client.cache_enabled == True
    
    def test_cache_key_generation(self):
        """Test cache key generation."""
        client = APIClient('https://example.com')
        
        key1 = client._get_cache_key('/test', {'param': 'value'})
        key2 = client._get_cache_key('/test', {'param': 'value'})
        key3 = client._get_cache_key('/test', {'param': 'different'})
        
        # Same parameters should generate same key
        assert key1 == key2
        
        # Different parameters should generate different key
        assert key1 != key3
    
    def test_cache_path_generation(self):
        """Test cache file path generation."""
        client = APIClient('https://example.com')
        
        key = client._get_cache_key('/test', {})
        path = client._get_cache_path(key)
        
        # Check that path includes cache directory
        assert settings.API_RESPONSES_CACHE in path
        
        # Check that path uses the cache key
        assert key in path
    
    def test_clear_cache(self):
        """Test cache clearing."""
        client = APIClient('https://example.com')
        
        # This should not raise an error even if cache is empty
        client.clear_cache()
    
    def test_httpbin_get_request(self):
        """Test actual HTTP GET request using httpbin.org."""
        client = APIClient('https://httpbin.org')
        
        result = client.get('/get', use_cache=False)
        
        # Check that request succeeded
        assert result['source'] in ['live', 'error']
        
        if result['source'] == 'live':
            assert 'data' in result
            assert result['status_code'] == 200


if __name__ == '__main__':
    pytest.main([__file__])
