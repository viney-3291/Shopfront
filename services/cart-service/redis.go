package main

import (
	"bufio"
	"fmt"
	"net"
	"os"
	"strconv"
	"strings"
	"time"
)

type RedisClient struct {
	addr string
}

func NewRedisClient() *RedisClient {
	host := os.Getenv("REDIS_HOST")
	if host == "" {
		host = "redis"
	}
	port := os.Getenv("REDIS_PORT")
	if port == "" {
		port = "6379"
	}
	return &RedisClient{addr: host + ":" + port}
}

func (c *RedisClient) dial() (net.Conn, error) {
	return net.DialTimeout("tcp", c.addr, 3*time.Second)
}

func encodeCommand(args ...string) string {
	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("*%d\r\n", len(args)))
	for _, a := range args {
		sb.WriteString(fmt.Sprintf("$%d\r\n%s\r\n", len(a), a))
	}
	return sb.String()
}

// readReply reads a single RESP reply and returns it as a string plus whether it was nil.
func readReply(r *bufio.Reader) (string, bool, error) {
	line, err := r.ReadString('\n')
	if err != nil {
		return "", false, err
	}
	line = strings.TrimRight(line, "\r\n")
	if len(line) == 0 {
		return "", true, nil
	}
	switch line[0] {
	case '+':
		return line[1:], false, nil
	case '-':
		return "", false, fmt.Errorf("redis error: %s", line[1:])
	case ':':
		return line[1:], false, nil
	case '$':
		n, err := strconv.Atoi(line[1:])
		if err != nil {
			return "", false, err
		}
		if n == -1 {
			return "", true, nil
		}
		buf := make([]byte, n+2) // +2 for trailing \r\n
		_, err = ioReadFull(r, buf)
		if err != nil {
			return "", false, err
		}
		return string(buf[:n]), false, nil
	default:
		return "", false, fmt.Errorf("unsupported redis reply: %q", line)
	}
}

func ioReadFull(r *bufio.Reader, buf []byte) (int, error) {
	total := 0
	for total < len(buf) {
		n, err := r.Read(buf[total:])
		total += n
		if err != nil {
			return total, err
		}
	}
	return total, nil
}

func (c *RedisClient) Set(key, value string) error {
	conn, err := c.dial()
	if err != nil {
		return err
	}
	defer conn.Close()
	_, err = conn.Write([]byte(encodeCommand("SET", key, value)))
	if err != nil {
		return err
	}
	_, _, err = readReply(bufio.NewReader(conn))
	return err
}

func (c *RedisClient) Get(key string) (string, bool, error) {
	conn, err := c.dial()
	if err != nil {
		return "", false, err
	}
	defer conn.Close()
	_, err = conn.Write([]byte(encodeCommand("GET", key)))
	if err != nil {
		return "", false, err
	}
	val, isNil, err := readReply(bufio.NewReader(conn))
	return val, isNil, err
}

func (c *RedisClient) Del(key string) error {
	conn, err := c.dial()
	if err != nil {
		return err
	}
	defer conn.Close()
	_, err = conn.Write([]byte(encodeCommand("DEL", key)))
	if err != nil {
		return err
	}
	_, _, err = readReply(bufio.NewReader(conn))
	return err
}

func (c *RedisClient) Ping() error {
	conn, err := c.dial()
	if err != nil {
		return err
	}
	defer conn.Close()
	_, err = conn.Write([]byte(encodeCommand("PING")))
	if err != nil {
		return err
	}
	_, _, err = readReply(bufio.NewReader(conn))
	return err
}
